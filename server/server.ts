// server/server.ts
import { WebSocketServer, WebSocket } from "ws";

type Client = WebSocket;
type RoomId = string;

type JoinMsg = { type: "join"; room: RoomId };
type ClipboardMsg = { type: "clipboard"; text: string };
type Message = JoinMsg | ClipboardMsg;

const wss = new WebSocketServer({ port: 3001 });
const rooms = new Map<RoomId, Set<Client>>();

function broadcast(room: RoomId, sender: Client, payload: object) {
  const clients = rooms.get(room);
  if (!clients) return;
  for (const client of clients) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  }
}

wss.on("connection", (ws: Client) => {
  let currentRoom: RoomId | null = null;

  ws.on("message", (raw) => {
    let data: Message;
    try {
      data = JSON.parse(String(raw)) as Message;
    } catch {
      return;
    }

    if (data.type === "join") {
      currentRoom = data.room;
      if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
      rooms.get(currentRoom)!.add(ws);
      return;
    }

    if (data.type === "clipboard" && currentRoom) {
      broadcast(currentRoom, ws, { type: "clipboard", text: data.text });
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const set = rooms.get(currentRoom)!;
      set.delete(ws);
      if (set.size === 0) rooms.delete(currentRoom);
    }
  });
});

console.log("WS server on ws://localhost:3001");
