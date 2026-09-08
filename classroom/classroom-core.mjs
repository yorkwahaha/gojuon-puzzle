export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;
export const STALE_MS = 45_000;
export const CONNECTED_MS = 8_000;
export const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
export const MAX_SNAPSHOT_BYTES = 16 * 1024;

const PHASES = new Set(['empty', 'lobby', 'play', 'done']);
const CHARTS = new Set(['seion', 'dakuon', 'youon', 'all']);
const SIZES = new Set(['6x3', '8x4', '10x5', '12x6', '14x7']);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function randomBytes(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateCode() {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

export function generateToken() {
  const bytes = randomBytes(18);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function isRoomCode(value) {
  return typeof value === 'string' && new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(value);
}

function clipString(value, max) {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

function clipInt(value, min, max) {
  if (value == null || value === '') return null;
  if (!Number.isFinite(Number(value))) return null;
  const next = Math.round(Number(value));
  if (!Number.isInteger(next)) return null;
  return Math.min(max, Math.max(min, next));
}

function sanitizeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const chartId = CHARTS.has(raw.chartId) ? raw.chartId : 'seion';
  const sizeId = SIZES.has(raw.sizeId) ? raw.sizeId : '8x4';
  return {
    modeId: clipString(raw.modeId, 24) || 'kata-hira',
    chartId,
    puzzleId: clipString(raw.puzzleId, 80),
    sizeId,
    seed: clipInt(raw.seed, 0, 4294967295),
  };
}

export function sanitizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const phase = PHASES.has(raw.phase) ? raw.phase : 'lobby';
  const placed = Array.isArray(raw.placed)
    ? raw.placed.slice(0, 100).map((id) => clipString(id, 32)).filter(Boolean)
    : [];
  return {
    phase,
    heartbeat: clipInt(raw.heartbeat, 0, Number.MAX_SAFE_INTEGER) || Date.now(),
    config: sanitizeConfig(raw.config),
    placed,
    mistakes: clipInt(raw.mistakes, 0, 999) || 0,
    selected: clipString(raw.selected, 32) || null,
    focusSlot: clipString(raw.focusSlot, 32) || null,
    wrongId: clipString(raw.wrongId, 32) || null,
    wrongPieceId: clipString(raw.wrongPieceId, 32) || null,
    startedAt: clipInt(raw.startedAt, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function createSession(now, {code} = {}) {
  const roomCode = code || generateCode();
  if (!isRoomCode(roomCode)) throw new TypeError('Invalid room code');
  return {
    code: roomCode,
    teacherToken: generateToken(),
    studentToken: null,
    studentSeenAt: 0,
    ended: false,
    endedAt: 0,
    createdAt: now,
    snapshot: null,
  };
}

export function sessionExpired(session, now) {
  return !session || now - session.createdAt > ROOM_TTL_MS;
}

export function studentConnected(session, now) {
  return Boolean(session?.studentToken && now - session.studentSeenAt <= CONNECTED_MS);
}

export function joinStudent(session, now) {
  if (!session || sessionExpired(session, now)) return {error: 'not_found', status: 404};
  if (session.ended) return {error: 'ended', status: 409};
  if (session.studentToken && now - session.studentSeenAt < STALE_MS) {
    return {error: 'occupied', status: 409};
  }
  session.studentToken = generateToken();
  session.studentSeenAt = now;
  return {studentToken: session.studentToken};
}

export function putSnapshot(session, token, raw, now) {
  if (!session || sessionExpired(session, now)) return {error: 'not_found', status: 404};
  if (token !== session.studentToken) return {error: 'unauthorized', status: 401};
  const snapshot = sanitizeSnapshot(raw);
  if (!snapshot) return {error: 'invalid_snapshot', status: 400};
  session.snapshot = snapshot;
  session.studentSeenAt = now;
  return {ended: session.ended};
}

export function teacherView(session, token, now) {
  if (!session || sessionExpired(session, now)) return {error: 'not_found', status: 404};
  if (token !== session.teacherToken) return {error: 'unauthorized', status: 401};
  return {
    code: session.code,
    ended: session.ended,
    studentJoined: Boolean(session.studentToken),
    studentConnected: studentConnected(session, now),
    snapshot: session.snapshot,
  };
}

export function endSession(session, token, now) {
  if (!session || sessionExpired(session, now)) return {error: 'not_found', status: 404};
  if (token !== session.teacherToken) return {error: 'unauthorized', status: 401};
  session.ended = true;
  session.endedAt = now;
  return {ended: true};
}

export class MemoryStore {
  constructor() {
    this.rooms = new Map();
  }

  async create(session) {
    this.rooms.set(session.code, session);
    return session;
  }

  async get(code) {
    return this.rooms.get(code) || null;
  }

  async save(session) {
    this.rooms.set(session.code, session);
    return session;
  }

  purge(now) {
    for (const [code, session] of this.rooms) {
      if (sessionExpired(session, now)) this.rooms.delete(code);
    }
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...CORS, 'Content-Type': 'application/json; charset=utf-8'},
  });
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : '';
}

function roomFromPath(path) {
  const match = path.match(/^\/rooms\/([A-HJ-NP-Z2-9]{4})(?=\/|$)/);
  return match ? match[1] : '';
}

async function readJson(request) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_SNAPSHOT_BYTES) {
    return {error: json(413, {error: 'too_large'})};
  }
  const text = await request.text();
  if (text.length > MAX_SNAPSHOT_BYTES) return {error: json(413, {error: 'too_large'})};
  if (!text) return {value: null};
  try {
    return {value: JSON.parse(text)};
  } catch {
    return {error: json(400, {error: 'invalid_json'})};
  }
}

export async function handleClassroomRequest(request, store, now = Date.now()) {
  if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  store.purge?.(now);

  if (request.method === 'POST' && path === '/rooms') {
    let session;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = createSession(now);
      if (!(await store.get(candidate.code))) {
        session = await store.create(candidate);
        break;
      }
    }
    if (!session) return json(503, {error: 'busy'});
    return json(201, {code: session.code, teacherToken: session.teacherToken});
  }

  const code = roomFromPath(path);
  if (!code) return json(404, {error: 'not_found'});
  const rest = path.slice(`/rooms/${code}`.length);

  if (request.method === 'POST' && rest === '') {
    if (await store.get(code)) return json(409, {error: 'exists'});
    const session = await store.create(createSession(now, {code}));
    return json(201, {code: session.code, teacherToken: session.teacherToken});
  }

  const session = await store.get(code);
  if (!session || sessionExpired(session, now)) return json(404, {error: 'not_found'});

  if (request.method === 'POST' && rest === '/join') {
    const result = joinStudent(session, now);
    if (result.error) return json(result.status, {error: result.error});
    await store.save(session);
    return json(200, {studentToken: result.studentToken});
  }

  if (request.method === 'PUT' && rest === '/snapshot') {
    const parsed = await readJson(request);
    if (parsed.error) return parsed.error;
    const result = putSnapshot(session, bearer(request), parsed.value, now);
    if (result.error) return json(result.status, {error: result.error});
    await store.save(session);
    return json(200, result);
  }

  if (request.method === 'GET' && rest === '') {
    const result = teacherView(session, bearer(request), now);
    if (result.error) return json(result.status, {error: result.error});
    return json(200, result);
  }

  if (request.method === 'POST' && rest === '/end') {
    const result = endSession(session, bearer(request), now);
    if (result.error) return json(result.status, {error: result.error});
    await store.save(session);
    return json(200, result);
  }

  return json(404, {error: 'not_found'});
}
