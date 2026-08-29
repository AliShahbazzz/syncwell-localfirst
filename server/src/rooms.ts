import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as awarenessProtocol from "y-protocols/awareness";
import type { WebSocket } from "ws";

export interface Room {
  doc: Y.Doc;
  awareness: Awareness;
  clients: Set<WebSocket>;
}

const rooms = new Map<string, Room>();

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

function send(ws: WebSocket, message: Uint8Array) {
  if (ws.readyState === ws.OPEN) ws.send(message);
}

export function getOrCreateRoom(roomName: string): Room {
  let room = rooms.get(roomName);
  if (room) return room;

  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  room = { doc, awareness, clients: new Set() };
  rooms.set(roomName, room);

  // Registered ONCE per room, not per connection. `origin` is whichever
  // client's WebSocket triggered the change — we broadcast to everyone
  // else in the room, excluding only that original sender.
  doc.on("update", (update: Uint8Array, origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    encoding.writeVarUint(encoder, 2); // sync step "update" message subtype
    encoding.writeVarUint8Array(encoder, update);
    const encoded = encoding.toUint8Array(encoder);
    room!.clients.forEach((client) => {
      if (client !== origin) send(client, encoded);
    });
  });

  awareness.on(
    "update",
    (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const encoded = encoding.toUint8Array(encoder);
      room!.clients.forEach((client) => {
        if (client !== origin) send(client, encoded);
      });
    },
  );

  return room;
}

export function removeClientFromRoom(roomName: string, ws: WebSocket) {
  rooms.get(roomName)?.clients.delete(ws);
}
