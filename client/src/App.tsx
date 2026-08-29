import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";

import "./App.css";

// A distinct color + name per browser tab/session, so you can visually
// tell users apart. In a real app this would come from your auth system.
const CURSOR_COLORS = [
  "#f87171",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
];
const ADJECTIVES = ["Swift", "Quiet", "Bright", "Bold", "Calm", "Sharp"];
const ANIMALS = ["Fox", "Owl", "Wolf", "Hawk", "Bear", "Lynx"];

function randomUser() {
  const name = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${
    ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  }`;
  const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  return { name, color };
}

interface PeerState {
  name: string;
  color: string;
}

function App() {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider] = useState(
    () =>
      new WebsocketProvider("ws://localhost:1234", "syncwell-test-doc", ydoc),
  );
  const [status, setStatus] = useState("loading...");
  const [peers, setPeers] = useState<PeerState[]>([]);
  const currentUser = useMemo(randomUser, []);

  useEffect(() => {
    const persistence = new IndexeddbPersistence("syncwell-test-doc", ydoc);
    persistence.on("synced", () => setStatus("synced from IndexedDB"));

    provider.on("status", (event: { status: string }) => {
      console.log("WebSocket status:", event.status);
    });

    // Publish our own presence info to the shared awareness state.
    // Every other connected client will receive this via the server relay.
    provider.awareness.setLocalStateField("user", {
      name: currentUser.name,
      color: currentUser.color,
    });

    console.log(
      "awareness states:",
      Array.from(provider.awareness.getStates().entries()),
    );

    // Whenever ANY client's awareness state changes (join, leave, or
    // update), recompute the list of everyone currently online.
    const updatePeers = () => {
      const rawStates = Array.from(provider.awareness.getStates().entries());
      console.log("awareness raw states:", JSON.stringify(rawStates, null, 2));

      const states = Array.from(
        provider.awareness.getStates().values(),
      ) as Array<{
        user?: PeerState;
      }>;
      const users = states
        .map((s) => s.user)
        .filter((u): u is PeerState => Boolean(u));
      setPeers(users);
    };
    provider.awareness.on("change", updatePeers);
    updatePeers();

    return () => {
      provider.awareness.off("change", updatePeers);
      persistence.destroy();
      provider.destroy();
    };
  }, [ydoc, provider, currentUser]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc, field: "default" }),
      CollaborationCaret.configure({
        provider,
        user: currentUser,
      }),
    ],
  });

  return (
  <div className="syncwell">
    <h1>Syncwell</h1>
    <p className="syncwell__status">Status: {status}</p>

    <div className="syncwell__peers">
      <span className="syncwell__online-label">Online:</span>

      {peers.map((peer, i) => (
        <span key={i} className="syncwell__peer">
          <span
            className="syncwell__peer-dot"
            style={{ background: peer.color }}
          />
          {peer.name}
        </span>
      ))}
    </div>

    <div className="syncwell__editor">
      <EditorContent editor={editor} />
    </div>
  </div>
);
}

export default App;
