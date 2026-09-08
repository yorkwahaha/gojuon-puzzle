import {generateCode, handleClassroomRequest} from './classroom-core.mjs';

function durableStore(room) {
  return {
    async create(session) {
      room.session = session;
      await room.ctx.storage.put('session', session);
      return session;
    },
    async get(code) {
      if (!room.session || room.session.code !== code) return null;
      return room.session;
    },
    async save(session) {
      room.session = session;
      await room.ctx.storage.put('session', session);
      return session;
    },
  };
}

export class ClassroomRoom {
  constructor(state) {
    this.ctx = state;
    this.session = null;
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    this.session = await this.ctx.storage.get('session') || null;
    this.loaded = true;
  }

  async fetch(request) {
    await this.load();
    return handleClassroomRequest(request, durableStore(this));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname.replace(/\/+$/, '') === '/rooms') {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const code = generateCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const createUrl = new URL(request.url);
        createUrl.pathname = `/rooms/${code}`;
        const response = await stub.fetch(new Request(createUrl, {method: 'POST', headers: request.headers}));
        if (response.status !== 409) return response;
      }
      return new Response(JSON.stringify({error: 'busy'}), {
        status: 503,
        headers: {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*'},
      });
    }
    const match = url.pathname.match(/^\/rooms\/([A-HJ-NP-Z2-9]{4})(?:\/|$)/);
    if (!match) {
      return handleClassroomRequest(request, durableStore({ctx: {storage: {get: async () => null, put: async () => {}}}, session: null}));
    }
    const stub = env.ROOMS.get(env.ROOMS.idFromName(match[1]));
    return stub.fetch(request);
  },
};
