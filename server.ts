import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

interface CarVisualConfig {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  decalType: string;
  stripeColor: string;
}

interface RoomPlayer {
  id: string;
  username: string;
  car: CarVisualConfig;
  x: number;
  y: number;
  z: number;
  rotY: number;
  steer: number;
  speed: number;
  distance: number;
  lap: number;
  finished: boolean;
  finishTime: number | null;
  finishRank: number | null;
  ws: WebSocket;
}

interface RaceRoom {
  code: string;
  hostId: string;
  trackId: string;
  totalLaps: number;
  lapDistance: number;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  raceStartTime: number;
  countdownTimer: ReturnType<typeof setInterval> | null;
  syncTimer: ReturnType<typeof setInterval> | null;
  players: Map<string, RoomPlayer>;
}

const rooms = new Map<string, RaceRoom>();
const clientToRoom = new Map<WebSocket, { roomCode: string; playerId: string }>();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const prefix = Math.random() > 0.5 ? 'RACE' : 'APEX';
    let suffix = '';
    for (let i = 0; i < 3; i++) {
      suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    const code = `${prefix.slice(0, 3)}${suffix}`;
    if (!rooms.has(code)) return code;
  }
  return `RAC${Math.floor(100 + Math.random() * 899)}`;
}

function generatePlayerId(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

function serializeRoomState(room: RaceRoom) {
  const players = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    username: p.username,
    car: p.car,
    distance: p.distance,
    lap: p.lap,
    finished: p.finished,
    finishTime: p.finishTime,
    finishRank: p.finishRank,
    isHost: p.id === room.hostId,
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    trackId: room.trackId,
    totalLaps: room.totalLaps,
    lapDistance: room.lapDistance,
    status: room.status,
    players,
  };
}

function broadcastToRoom(room: RaceRoom, type: string, payload: unknown, excludeId?: string) {
  const message = JSON.stringify({ type, payload });
  for (const player of room.players.values()) {
    if (excludeId && player.id === excludeId) continue;
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(message);
    }
  }
}

function sendToClient(ws: WebSocket, type: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function startRoomSyncLoop(room: RaceRoom) {
  if (room.syncTimer) clearInterval(room.syncTimer);
  // 25 Hz (40ms) lightweight transform broadcast
  room.syncTimer = setInterval(() => {
    if (room.status !== 'racing' && room.status !== 'countdown') return;
    const snapshots = Array.from(room.players.values()).map((p) => [
      p.id,
      Number(p.x.toFixed(2)),
      Number(p.y.toFixed(2)),
      Number(p.z.toFixed(2)),
      Number(p.rotY.toFixed(3)),
      Number(p.steer.toFixed(3)),
      Number(p.speed.toFixed(1)),
      Math.round(p.distance),
      p.lap,
      p.finished ? 1 : 0,
      p.finishRank ?? 0,
    ]);
    broadcastToRoom(room, 'players:sync', { players: snapshots });
  }, 40);
}

function stopRoomTimers(room: RaceRoom) {
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = null;
  }
  if (room.syncTimer) {
    clearInterval(room.syncTimer);
    room.syncTimer = null;
  }
}

function removeClientFromRoom(ws: WebSocket) {
  const mapping = clientToRoom.get(ws);
  if (!mapping) return;
  clientToRoom.delete(ws);

  const room = rooms.get(mapping.roomCode);
  if (!room) return;

  const leavingPlayer = room.players.get(mapping.playerId);
  room.players.delete(mapping.playerId);

  if (room.players.size === 0) {
    stopRoomTimers(room);
    rooms.delete(room.code);
    return;
  }

  // Host migration if host disconnected
  if (room.hostId === mapping.playerId) {
    const nextHost = room.players.values().next().value;
    if (nextHost) {
      room.hostId = nextHost.id;
      broadcastToRoom(room, 'host:migrated', {
        newHostId: nextHost.id,
        newHostUsername: nextHost.username,
      });
    }
  }

  if (leavingPlayer) {
    broadcastToRoom(room, 'player:left', {
      id: leavingPlayer.id,
      username: leavingPlayer.username,
    });
  }

  broadcastToRoom(room, 'room:state', serializeRoomState(room));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    (ws as WebSocket & { isAlive?: boolean }).isAlive = true;

    ws.on('pong', () => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    });

    ws.on('message', (raw) => {
      let msg: { type: string; payload?: Record<string, unknown> };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const { type, payload = {} } = msg;

      if (type === 'room:create') {
        removeClientFromRoom(ws);

        const code = generateRoomCode();
        const playerId = generatePlayerId();
        const username = String(payload.username || 'RACER').slice(0, 16);
        const car = payload.car as CarVisualConfig;
        const trackId = String(payload.trackId || 'sunset-coastal');
        const totalLaps = Math.max(1, Math.min(5, Number(payload.totalLaps) || 3));

        const player: RoomPlayer = {
          id: playerId,
          username,
          car,
          x: -4.5,
          y: 0,
          z: 0,
          rotY: 0,
          steer: 0,
          speed: 0,
          distance: 0,
          lap: 1,
          finished: false,
          finishTime: null,
          finishRank: null,
          ws,
        };

        const room: RaceRoom = {
          code,
          hostId: playerId,
          trackId,
          totalLaps,
          lapDistance: 1200,
          status: 'lobby',
          raceStartTime: 0,
          countdownTimer: null,
          syncTimer: null,
          players: new Map([[playerId, player]]),
        };

        rooms.set(code, room);
        clientToRoom.set(ws, { roomCode: code, playerId });

        sendToClient(ws, 'room:joined', {
          selfId: playerId,
          room: serializeRoomState(room),
        });
        return;
      }

      if (type === 'room:join') {
        const code = String(payload.code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          sendToClient(ws, 'room:error', { message: `Room "${code}" not found. Check the code and try again.` });
          return;
        }
        if (room.players.size >= 4) {
          sendToClient(ws, 'room:error', { message: `Room "${code}" is full (4/4 racers).` });
          return;
        }
        if (room.status === 'racing' || room.status === 'countdown') {
          sendToClient(ws, 'room:error', { message: `Race in "${code}" is already underway.` });
          return;
        }

        removeClientFromRoom(ws);

        const playerId = generatePlayerId();
        const username = String(payload.username || 'RACER').slice(0, 16);
        const car = payload.car as CarVisualConfig;
        const slotIdx = room.players.size;
        const spawnX = [-4.5, -1.5, 1.5, 4.5][slotIdx % 4];

        const player: RoomPlayer = {
          id: playerId,
          username,
          car,
          x: spawnX,
          y: 0,
          z: 0,
          rotY: 0,
          steer: 0,
          speed: 0,
          distance: 0,
          lap: 1,
          finished: false,
          finishTime: null,
          finishRank: null,
          ws,
        };

        room.players.set(playerId, player);
        clientToRoom.set(ws, { roomCode: code, playerId });

        sendToClient(ws, 'room:joined', {
          selfId: playerId,
          room: serializeRoomState(room),
        });
        broadcastToRoom(room, 'room:state', serializeRoomState(room));
        return;
      }

      if (type === 'room:leave') {
        removeClientFromRoom(ws);
        return;
      }

      const mapping = clientToRoom.get(ws);
      if (!mapping) return;
      const room = rooms.get(mapping.roomCode);
      if (!room) return;
      const player = room.players.get(mapping.playerId);
      if (!player) return;

      if (type === 'room:update_car') {
        if (payload.username) player.username = String(payload.username).slice(0, 16);
        if (payload.car) player.car = payload.car as CarVisualConfig;
        broadcastToRoom(room, 'room:state', serializeRoomState(room));
        return;
      }

      if (type === 'room:set_track') {
        if (room.hostId !== player.id) return;
        if (payload.trackId) room.trackId = String(payload.trackId);
        if (payload.totalLaps) room.totalLaps = Math.max(1, Math.min(5, Number(payload.totalLaps)));
        broadcastToRoom(room, 'room:state', serializeRoomState(room));
        return;
      }

      if (type === 'race:start') {
        if (room.hostId !== player.id || room.status === 'countdown' || room.status === 'racing') return;

        // Assign clean starting grid positions across lanes
        const laneOffsets = [-4.5, -1.5, 1.5, 4.5];
        let idx = 0;
        for (const p of room.players.values()) {
          p.x = laneOffsets[idx % 4];
          p.y = 0;
          p.z = 0;
          p.rotY = 0;
          p.steer = 0;
          p.speed = 0;
          p.distance = 0;
          p.lap = 1;
          p.finished = false;
          p.finishTime = null;
          p.finishRank = null;
          idx++;
        }

        room.status = 'countdown';
        broadcastToRoom(room, 'room:state', serializeRoomState(room));
        startRoomSyncLoop(room);

        let count = 3;
        broadcastToRoom(room, 'race:countdown', { count });

        room.countdownTimer = setInterval(() => {
          count--;
          if (count > 0) {
            broadcastToRoom(room, 'race:countdown', { count });
          } else {
            if (room.countdownTimer) {
              clearInterval(room.countdownTimer);
              room.countdownTimer = null;
            }
            room.status = 'racing';
            room.raceStartTime = Date.now();
            broadcastToRoom(room, 'race:countdown', { count: 0 });
            broadcastToRoom(room, 'race:go', { startTime: room.raceStartTime });
            broadcastToRoom(room, 'room:state', serializeRoomState(room));
          }
        }, 1000);
        return;
      }

      if (type === 'player:state') {
        if (room.status !== 'racing') return;
        player.x = Number(payload.x) || 0;
        player.y = Number(payload.y) || 0;
        player.z = Number(payload.z) || 0;
        player.rotY = Number(payload.rotY) || 0;
        player.steer = Number(payload.steer) || 0;
        player.speed = Number(payload.speed) || 0;
        player.distance = Number(payload.d) || 0;
        player.lap = Number(payload.lap) || 1;
        return;
      }

      if (type === 'player:finish') {
        if (player.finished) return;
        const finishedCount = Array.from(room.players.values()).filter((p) => p.finished).length;
        player.finished = true;
        player.finishRank = finishedCount + 1;
        player.finishTime = Math.max(0.1, (Date.now() - room.raceStartTime) / 1000);

        broadcastToRoom(room, 'player:finished', {
          id: player.id,
          username: player.username,
          rank: player.finishRank,
          finishTime: player.finishTime,
        });

        const allFinished = Array.from(room.players.values()).every((p) => p.finished);
        if (allFinished) {
          room.status = 'finished';
        }
        broadcastToRoom(room, 'room:state', serializeRoomState(room));
        return;
      }

      if (type === 'room:back_to_lobby') {
        if (room.hostId !== player.id) return;
        stopRoomTimers(room);
        room.status = 'lobby';
        for (const p of room.players.values()) {
          p.distance = 0;
          p.lap = 1;
          p.finished = false;
          p.finishTime = null;
          p.finishRank = null;
        }
        broadcastToRoom(room, 'room:state', serializeRoomState(room));
        return;
      }
    });

    ws.on('close', () => {
      removeClientFromRoom(ws);
    });
  });

  // Heartbeat interval to terminate stale connections cleanly
  setInterval(() => {
    wss.clients.forEach((ws) => {
      const sock = ws as WebSocket & { isAlive?: boolean };
      if (sock.isAlive === false) {
        removeClientFromRoom(ws);
        return ws.terminate();
      }
      sock.isAlive = false;
      ws.ping();
    });
  }, 15000);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Turbo Horizon server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
