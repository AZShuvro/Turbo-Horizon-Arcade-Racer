import {
  MultiplayerCarConfig,
  MultiplayerRoomState,
  RemotePlayerTransform,
  TrackId,
} from '../types/game';

export type ServerMessageMap = {
  'room:joined': { selfId: string; room: MultiplayerRoomState };
  'room:state': MultiplayerRoomState;
  'room:error': { message: string };
  'race:countdown': { count: number };
  'race:go': { startTime: number };
  'players:sync': {
    players: [
      string, // id
      number, // x
      number, // y
      number, // z
      number, // rotY
      number, // steer
      number, // speed
      number, // distance
      number, // lap
      number, // finished (0|1)
      number  // finishRank
    ][];
  };
  'player:finished': {
    id: string;
    username: string;
    rank: number;
    finishTime: number;
  };
  'player:left': { id: string; username: string };
  'host:migrated': { newHostId: string; newHostUsername: string };
};

export type MultiplayerEvent =
  | { type: 'connection'; connected: boolean }
  | { type: 'room:joined'; payload: ServerMessageMap['room:joined'] }
  | { type: 'room:state'; payload: ServerMessageMap['room:state'] }
  | { type: 'room:error'; payload: ServerMessageMap['room:error'] }
  | { type: 'race:countdown'; payload: ServerMessageMap['race:countdown'] }
  | { type: 'race:go'; payload: ServerMessageMap['race:go'] }
  | { type: 'players:sync'; transforms: RemotePlayerTransform[] }
  | { type: 'player:finished'; payload: ServerMessageMap['player:finished'] }
  | { type: 'player:left'; payload: ServerMessageMap['player:left'] }
  | { type: 'host:migrated'; payload: ServerMessageMap['host:migrated'] };

type EventListener = (event: MultiplayerEvent) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private reconnectTimer: number | null = null;
  private pendingQueue: string[] = [];
  private intentionallyClosed = false;

  public connected = false;
  public selfId: string | null = null;
  public currentRoom: MultiplayerRoomState | null = null;

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: MultiplayerEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return new Promise((resolve) => {
        const onOpen = () => {
          this.ws?.removeEventListener('open', onOpen);
          resolve();
        };
        this.ws?.addEventListener('open', onOpen);
      });
    }

    this.intentionallyClosed = false;

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;

      try {
        const socket = new WebSocket(url);
        this.ws = socket;

        socket.onopen = () => {
          this.connected = true;
          this.emit({ type: 'connection', connected: true });
          while (this.pendingQueue.length > 0) {
            const msg = this.pendingQueue.shift()!;
            socket.send(msg);
          }
          resolve();
        };

        socket.onmessage = (evt) => {
          let parsed: { type: keyof ServerMessageMap; payload: unknown };
          try {
            parsed = JSON.parse(evt.data);
          } catch {
            return;
          }

          switch (parsed.type) {
            case 'room:joined': {
              const payload = parsed.payload as ServerMessageMap['room:joined'];
              this.selfId = payload.selfId;
              this.currentRoom = payload.room;
              this.emit({ type: 'room:joined', payload });
              break;
            }
            case 'room:state': {
              const payload = parsed.payload as ServerMessageMap['room:state'];
              this.currentRoom = payload;
              this.emit({ type: 'room:state', payload });
              break;
            }
            case 'room:error': {
              const payload = parsed.payload as ServerMessageMap['room:error'];
              this.emit({ type: 'room:error', payload });
              break;
            }
            case 'race:countdown': {
              const payload = parsed.payload as ServerMessageMap['race:countdown'];
              this.emit({ type: 'race:countdown', payload });
              break;
            }
            case 'race:go': {
              const payload = parsed.payload as ServerMessageMap['race:go'];
              this.emit({ type: 'race:go', payload });
              break;
            }
            case 'players:sync': {
              const payload = parsed.payload as ServerMessageMap['players:sync'];
              const transforms: RemotePlayerTransform[] = payload.players.map((arr) => ({
                id: arr[0],
                x: arr[1],
                y: arr[2],
                z: arr[3],
                rotY: arr[4],
                steer: arr[5],
                speed: arr[6],
                distance: arr[7],
                lap: arr[8],
                finished: arr[9] === 1,
                finishRank: arr[10],
              }));
              this.emit({ type: 'players:sync', transforms });
              break;
            }
            case 'player:finished': {
              const payload = parsed.payload as ServerMessageMap['player:finished'];
              this.emit({ type: 'player:finished', payload });
              break;
            }
            case 'player:left': {
              const payload = parsed.payload as ServerMessageMap['player:left'];
              this.emit({ type: 'player:left', payload });
              break;
            }
            case 'host:migrated': {
              const payload = parsed.payload as ServerMessageMap['host:migrated'];
              this.emit({ type: 'host:migrated', payload });
              break;
            }
          }
        };

        socket.onclose = () => {
          this.connected = false;
          this.ws = null;
          this.emit({ type: 'connection', connected: false });

          if (!this.intentionallyClosed && this.currentRoom) {
            if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = window.setTimeout(() => {
              this.connect().catch(() => {});
            }, 2000);
          }
        };

        socket.onerror = () => {
          if (!this.connected) {
            reject(new Error('Unable to connect to race server.'));
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private send(type: string, payload: Record<string, unknown> = {}) {
    const raw = JSON.stringify({ type, payload });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.pendingQueue.push(raw);
      this.connect().catch(() => {});
    }
  }

  public async createRoom(
    username: string,
    car: MultiplayerCarConfig,
    trackId: TrackId,
    totalLaps = 3
  ) {
    await this.connect();
    this.send('room:create', { username, car, trackId, totalLaps });
  }

  public async joinRoom(code: string, username: string, car: MultiplayerCarConfig) {
    await this.connect();
    this.send('room:join', { code: code.trim().toUpperCase(), username, car });
  }

  public leaveRoom() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('room:leave');
    }
    this.currentRoom = null;
    this.selfId = null;
  }

  public updateCar(username: string, car: MultiplayerCarConfig) {
    if (!this.currentRoom) return;
    this.send('room:update_car', { username, car });
  }

  public setTrack(trackId: TrackId, totalLaps?: number) {
    if (!this.currentRoom) return;
    this.send('room:set_track', { trackId, totalLaps });
  }

  public startRace() {
    if (!this.currentRoom) return;
    this.send('race:start');
  }

  public sendPlayerState(state: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    steer: number;
    speed: number;
    d: number;
    lap: number;
  }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentRoom) return;
    this.ws.send(
      JSON.stringify({
        type: 'player:state',
        payload: {
          x: Number(state.x.toFixed(2)),
          y: Number(state.y.toFixed(2)),
          z: Number(state.z.toFixed(2)),
          rotY: Number(state.rotY.toFixed(3)),
          steer: Number(state.steer.toFixed(3)),
          speed: Number(state.speed.toFixed(1)),
          d: Math.round(state.d),
          lap: state.lap,
        },
      })
    );
  }

  public sendFinish() {
    if (!this.currentRoom) return;
    this.send('player:finish');
  }

  public backToLobby() {
    if (!this.currentRoom) return;
    this.send('room:back_to_lobby');
  }

  public disconnect() {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.currentRoom = null;
    this.selfId = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

export const multiplayerClient = new MultiplayerClient();
