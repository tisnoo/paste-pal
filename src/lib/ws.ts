// src/lib/ws.ts
export type ServerMsg = { type: "clipboard"; text: string };

export function connectToRoom(
  roomId: string,
  onMessage: (msg: ServerMsg) => void
) {
  const ws = new WebSocket("ws://localhost:3001");

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "join", room: roomId }));
  });

  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data as string) as ServerMsg;
      onMessage?.(data);
    } catch {
      // ignore
    }
  });

  return {
    sendClipboard(text: string) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "clipboard", text }));
      }
    },
    close() {
      ws.close();
    }
  };
}
