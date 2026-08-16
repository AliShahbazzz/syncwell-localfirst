import { Editor } from "@tiptap/react";

export function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 8,
        borderBottom: "1px solid #eee",
        paddingBottom: 8,
      }}
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        style={{ fontWeight: editor.isActive("bold") ? "bold" : "normal" }}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        style={{ fontStyle: editor.isActive("italic") ? "italic" : "normal" }}
      >
        Italic
      </button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()}>
        Bullet List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        Quote
      </button>
    </div>
  );
}
