import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { Toolbar } from "./components/toolbar";
import "./App.css";

function App() {
  const [ydoc] = useState(() => new Y.Doc());
  const [status, setStatus] = useState("loading...");

  useEffect(() => {
    const persistence = new IndexeddbPersistence("syncwell-test-doc", ydoc);
    persistence.on("synced", () => {
      setStatus("synced from IndexedDB");
    });
    return () => {
      persistence.destroy();
    };
  }, [ydoc]);

  const editor = useEditor({
    extensions: [
      // Disable StarterKit's own undo/redo — Yjs's Collaboration extension
      // provides its own history that's aware of the CRDT, and the two
      // history systems conflict if both are active.
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: ydoc,
        // 'default' is the fragment name Yjs uses internally — must match
        // if you ever read this doc from another client/server context.
        field: "default",
      }),
    ],
  });

  if (!editor) return <div>Editor not ready...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
      <h1>Syncwell — Tiptap + Yjs sanity check</h1>
      <p style={{ color: "#666" }}>Status: {status}</p>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "1rem",
          minHeight: 200,
        }}
      >
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "1rem" }}>
        Type some formatted text (try **bold** via the toolbar-free markdown
        shortcuts StarterKit supports, e.g. type "# " for a heading), refresh
        the page, and it should persist.
      </p>
    </div>
  );
}

export default App;
