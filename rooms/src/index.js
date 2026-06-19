// Nuzz realtime rooms — matchmaking + relay for co-op play.
//
//   client --WS--> /find        -> Lobby DO: parks you, or pairs you with a waiting player and
//                                  hands both a roomId + role ('host' | 'guest').
//   client --WS--> /room/:id    -> Room DO: up to 2 sockets; relays every message to the other
//                                  player and announces 'ready' (both here) / 'partner_left'.
//
// The game owns the actual gameplay protocol — this Worker is a dumb, fast pipe. No PII, no storage.

const OPEN = 1; // WebSocket.READY_STATE_OPEN

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('nuzz-rooms ok', { headers: { 'content-type': 'text/plain' } });
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    if (url.pathname === '/find') {
      return env.LOBBY.get(env.LOBBY.idFromName('global')).fetch(request);
    }
    const m = url.pathname.match(/^\/room\/([a-z0-9]{4,32})$/i);
    if (m) {
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
    }
    return new Response('not found', { status: 404 });
  }
};

function send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch (e) {} }

// ---- Lobby: pairs the next two waiting players ----
export class Lobby {
  constructor(state, env) { this.state = state; this.env = env; this.waiting = null; }

  async fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    if (this.waiting && this.waiting.readyState === OPEN) {
      const host = this.waiting; this.waiting = null;
      const roomId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      send(host,   { type: 'matched', roomId, role: 'host'  });
      send(server, { type: 'matched', roomId, role: 'guest' });
      // both clients now reconnect to /room/:roomId; lobby sockets can drop
    } else {
      this.waiting = server;
      send(server, { type: 'waiting' });
      const drop = () => { if (this.waiting === server) this.waiting = null; };
      server.addEventListener('close', drop);
      server.addEventListener('error', drop);
    }
    return new Response(null, { status: 101, webSocket: client });
  }
}

// ---- Room: relays messages between the two matched players ----
export class Room {
  constructor(state, env) { this.state = state; this.env = env; this.sockets = []; }

  async fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    if (this.sockets.length >= 2) {
      send(server, { type: 'full' });
      server.close(1000, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.sockets.push(server);
    if (this.sockets.length === 2) this.sockets.forEach((s) => send(s, { type: 'ready' }));

    server.addEventListener('message', (ev) => {
      const other = this.sockets.find((s) => s !== server);
      if (other && other.readyState === OPEN) { try { other.send(ev.data); } catch (e) {} }
    });
    const bye = () => {
      this.sockets = this.sockets.filter((s) => s !== server);
      const other = this.sockets[0];
      if (other && other.readyState === OPEN) send(other, { type: 'partner_left' });
    };
    server.addEventListener('close', bye);
    server.addEventListener('error', bye);

    return new Response(null, { status: 101, webSocket: client });
  }
}
