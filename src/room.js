const PRODUCTION_API = 'https://gojuon-puzzle-classroom.yorkwahaha.workers.dev';
const PUBLIC_GAME_ORIGIN = 'https://yorkwahaha.github.io/gojuon-puzzle';
const STUDENT_KEY = 'gojuon_classroom_student';
const TEACHER_KEY = 'gojuon_classroom_teacher';
const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
const FETCH_MS = 8000;

export const HEARTBEAT_MS = 1500;
export const OFFLINE_MS = 8000;

export function parseRoomFromUrl(search = window.location.search) {
  const query = new URLSearchParams(search);
  const room = String(query.get('room') || '').trim().toUpperCase();
  return {
    room: CODE_RE.test(room) ? room : null,
    watch: query.get('watch') === '1',
  };
}

function isLoopbackHost(hostname = window.location.hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function publicGameOrigin() {
  const override = import.meta.env.VITE_PUBLIC_GAME_ORIGIN;
  if (typeof override === 'string' && override.trim()) {
    return override.trim().replace(/\/+$/, '');
  }
  return PUBLIC_GAME_ORIGIN;
}

export function gameOrigin() {
  if (isLoopbackHost()) return publicGameOrigin();
  const url = new URL(window.location.href);
  const path = url.pathname.replace(/\/teacher\.html$/i, '/').replace(/\/index\.html$/i, '/');
  return `${url.origin}${path.replace(/\/+$/, '')}`;
}

export function linksFor(room) {
  const origin = gameOrigin();
  const student = `${origin}/?room=${encodeURIComponent(room)}`;
  const teacher = new URL('teacher.html', `${origin}/`);
  teacher.searchParams.set('room', room);
  return { student, teacher: teacher.toString() };
}

export function roomApiBase() {
  try {
    const override = window.localStorage.getItem('gojuon_classroom_api');
    if (override) return String(override).replace(/\/+$/, '');
  } catch {
    // ignore
  }
  const env = import.meta.env.VITE_CLASSROOM_API;
  if (typeof env === 'string' && env.trim()) return env.trim().replace(/\/+$/, '');
  return PRODUCTION_API;
}

export function hasRoomBackend() {
  return Boolean(roomApiBase());
}

async function api(path, { method = 'GET', token, body, timeoutMs = FETCH_MS } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${roomApiBase()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    window.clearTimeout(timer);
  }
}

function readStudentToken(code) {
  try {
    return sessionStorage.getItem(`${STUDENT_KEY}:${code}`) || '';
  } catch {
    return '';
  }
}

function writeStudentToken(code, token) {
  try {
    sessionStorage.setItem(`${STUDENT_KEY}:${code}`, token);
  } catch {
    // ignore
  }
}

export function readTeacherSession() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(TEACHER_KEY) || 'null');
    if (parsed && CODE_RE.test(parsed.code) && typeof parsed.teacherToken === 'string') return parsed;
  } catch {
    // ignore
  }
  return null;
}

function writeTeacherSession(session) {
  try {
    sessionStorage.setItem(TEACHER_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearTeacherSession() {
  try {
    sessionStorage.removeItem(TEACHER_KEY);
  } catch {
    // ignore
  }
}

const lastSnapshot = new Map();

export async function createRoom() {
  const result = await api('/rooms', { method: 'POST' });
  if (!result.ok || !result.data?.code || !result.data?.teacherToken) {
    throw new Error(result.data?.error || 'create_failed');
  }
  const session = { code: result.data.code, teacherToken: result.data.teacherToken };
  writeTeacherSession(session);
  lastSnapshot.delete(session.code);
  return session.code;
}

function endedKey(code) {
  return `${STUDENT_KEY}:ended:${code}`;
}

export function markRoomEnded(code) {
  try {
    sessionStorage.setItem(endedKey(code), '1');
  } catch {
    // ignore
  }
}

export function isRoomEnded(code) {
  try {
    return sessionStorage.getItem(endedKey(code)) === '1';
  } catch {
    return false;
  }
}

const joining = new Map();

async function joinRoom(code) {
  const existing = readStudentToken(code);
  if (existing) return existing;
  if (joining.has(code)) return joining.get(code);
  const request = (async () => {
    const result = await api(`/rooms/${code}/join`, { method: 'POST' });
    if (!result.ok) {
      const error = result.data?.error || 'join_failed';
      if (error === 'ended') markRoomEnded(code);
      throw Object.assign(new Error(error), { code: error, status: result.status });
    }
    writeStudentToken(code, result.data.studentToken);
    return result.data.studentToken;
  })();
  joining.set(code, request);
  try {
    return await request;
  } finally {
    joining.delete(code);
  }
}

export async function endRoom(room) {
  const session = readTeacherSession();
  if (!session || session.code !== room) {
    throw Object.assign(new Error('no_session'), { code: 'no_session' });
  }
  const result = await api(`/rooms/${room}/end`, { method: 'POST', token: session.teacherToken });
  if (!result.ok) {
    throw Object.assign(new Error(result.data?.error || 'end_failed'), {
      code: result.data?.error,
      status: result.status,
    });
  }
  return result.data;
}

export async function patchRoom(room, data) {
  const previous = lastSnapshot.get(room) || {};
  const next = { ...previous, ...data };
  if (data?.config) next.config = { ...(previous.config || {}), ...data.config };
  if (data?.placed) next.placed = [...data.placed];
  lastSnapshot.set(room, next);
  let token = readStudentToken(room);
  if (!token) token = await joinRoom(room);
  const result = await api(`/rooms/${room}/snapshot`, { method: 'PUT', token, body: next });
  if (result.status === 401) {
    try {
      sessionStorage.removeItem(`${STUDENT_KEY}:${room}`);
    } catch {
      // ignore
    }
    token = await joinRoom(room);
    const retry = await api(`/rooms/${room}/snapshot`, { method: 'PUT', token, body: next });
    if (!retry.ok) {
      const error = retry.data?.error || 'put_failed';
      throw Object.assign(new Error(error), { code: error, status: retry.status });
    }
    if (retry.data?.ended) markRoomEnded(room);
    return retry.data;
  }
  if (result.status === 409 && result.data?.error === 'ended') {
    markRoomEnded(room);
    throw Object.assign(new Error('ended'), { code: 'ended', status: 409 });
  }
  if (!result.ok) {
    const error = result.data?.error || 'put_failed';
    throw Object.assign(new Error(error), { code: error, status: result.status });
  }
  if (result.data?.ended) markRoomEnded(room);
  return result.data;
}

function mapTeacherRoom(data) {
  const snap = data?.snapshot;
  return {
    phase: snap?.phase || (data?.studentJoined ? 'lobby' : 'empty'),
    heartbeat: data?.studentConnected ? Date.now() : 0,
    config: snap?.config || null,
    placed: snap?.placed || [],
    mistakes: snap?.mistakes || 0,
    selected: snap?.selected || null,
    focusSlot: snap?.focusSlot || null,
    wrongId: snap?.wrongId || null,
    wrongPieceId: snap?.wrongPieceId || null,
    startedAt: snap?.startedAt || null,
    studentJoined: Boolean(data?.studentJoined),
    studentConnected: Boolean(data?.studentConnected),
    ended: Boolean(data?.ended),
  };
}

export function subscribeRoom(room, onData) {
  const session = readTeacherSession();
  if (!session || session.code !== room) {
    onData({ phase: 'empty', heartbeat: 0, error: 'no_session' });
    return () => {};
  }
  let stopped = false;
  let timer = 0;
  const tick = async () => {
    if (stopped) return;
    try {
      const result = await api(`/rooms/${room}`, { token: session.teacherToken });
      if (result.ok) onData(mapTeacherRoom(result.data));
      else onData({ phase: 'empty', heartbeat: 0, error: result.data?.error || 'unavailable' });
    } catch {
      onData({ phase: 'empty', heartbeat: 0, error: 'offline' });
    }
    if (!stopped) timer = window.setTimeout(tick, 800);
  };
  void tick();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
  };
}

export function isStudentOnline(state) {
  if (typeof state?.studentConnected === 'boolean') return state.studentConnected;
  if (!state?.heartbeat) return false;
  return Date.now() - state.heartbeat < OFFLINE_MS;
}

export function lobbySnapshot({ modeId, chartId, puzzleId, sizeId }) {
  return {
    phase: 'lobby',
    heartbeat: Date.now(),
    config: { modeId, chartId, puzzleId, sizeId, seed: null },
    placed: [],
    mistakes: 0,
    selected: null,
    focusSlot: null,
    wrongId: null,
    wrongPieceId: null,
    startedAt: null,
  };
}

export function playSnapshot({ config, placed, mistakes, selected, focusSlot, wrongId, wrongPieceId, startedAt, done }) {
  return {
    phase: done ? 'done' : 'play',
    heartbeat: Date.now(),
    config: {
      modeId: config.modeId,
      chartId: config.chartId,
      puzzleId: config.puzzle.id,
      sizeId: config.sizeId,
      seed: config.seed,
    },
    placed: [...placed],
    mistakes,
    selected: selected || null,
    focusSlot: focusSlot || null,
    wrongId,
    wrongPieceId,
    startedAt,
  };
}
