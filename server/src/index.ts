import { WebSocketServer, type WebSocket } from "ws";
import http from "http";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { getOrCreateRoom, removeClientFromRoom } from "./rooms.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 1234;

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

function send(ws: WebSocket, message: Uint8Array) {
  if (ws.readyState === ws.OPEN) ws.send(message);
}

function setupRoomConnection(ws: WebSocket, roomName: string) {
  const room = getOrCreateRoom(roomName);
  room.clients.add(ws);

  // Initial sync handshake for this newly connected client.
  const syncMessage = encoding.createEncoder();
  encoding.writeVarUint(syncMessage, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(syncMessage, room.doc);
  send(ws, encoding.toUint8Array(syncMessage));

  const awarenessStates = room.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessMessage = encoding.createEncoder();
    encoding.writeVarUint(awarenessMessage, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessMessage,
      awarenessProtocol.encodeAwarenessUpdate(
        room.awareness,
        Array.from(awarenessStates.keys()),
      ),
    );
    send(ws, encoding.toUint8Array(awarenessMessage));
  }

  ws.on("message", (data: Buffer) => {
    const decoder = decoding.createDecoder(new Uint8Array(data));
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        // Passing `ws` as origin here is what lets the room-level update
        // listener know who NOT to echo this change back to.
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
        if (encoding.length(encoder) > 1)
          send(ws, encoding.toUint8Array(encoder));
        break;
      }
      case MESSAGE_AWARENESS: {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          ws,
        );
        break;
      }
    }
  });

  ws.on("close", () => {
    removeClientFromRoom(roomName, ws);
  });
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Syncwell relay server is running");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const roomName = (req.url || "/default").slice(1) || "default";
  setupRoomConnection(ws, roomName);
});

server.listen(PORT, () => {
  console.log(`Syncwell relay server listening on ws://localhost:${PORT}`);
});
