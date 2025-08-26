// components/CommentBox.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// パネルのドラッグを無効化するラッパー
function NoDragArea({ children, style }) {
  const stop = (e) => e.stopPropagation();
  return (
    <div
      onMouseDownCapture={stop}
      onTouchStartCapture={stop}
      onPointerDownCapture={stop}
      onWheelCapture={stop}
      style={style}
    >
      {children}
    </div>
  );
}

export default function CommentBox({ targetType, targetId }) {
  const [comments, setComments] = useState([]);
  const [username, setUsername] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizeId = (id) =>
    typeof id === "string" && /^\d+$/.test(id) ? Number(id) : id;

  useEffect(() => {
    if (targetType && targetId !== undefined && targetId !== null) {
      fetchComments();
    }
  }, [targetType, targetId]);

  async function fetchComments() {
    setLoading(true);
    const idFilter = normalizeId(targetId);

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("target_type", targetType) // "photos"
      .eq("target_id", idFilter)     // int8
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchComments error:", error);
    } else {
      setComments(data || []);
    }
    setLoading(false);
  }

  async function submitComment() {
    if (!username.trim() || !text.trim()) return;

    const idValue = normalizeId(targetId);

    const { error } = await supabase.from("comments").insert([
      {
        username: username.trim(),
        text: text.trim(),
        target_type: targetType, // "photos"
        target_id: idValue,      // int8
      },
    ]);

    if (error) {
      console.error("insert error:", error);
      alert("送信に失敗しました: " + (error.message || "unknown error"));
      return;
    }
    setText("");
    fetchComments();
  }

  if (!targetType || targetId === undefined || targetId === null) return null;

  return (
    <NoDragArea style={{ maxWidth: "400px" }}>
      <h3>💬 コメント</h3>

      <input
        placeholder="名前"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          width: "100%",
          marginBottom: "0.5em",
          padding: "8px",
          boxSizing: "border-box",
          color: "#333",
        }}
        // 念のための保険（ドラッグ抑止を子要素にも）
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />

      <textarea
        placeholder="コメント内容"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          width: "100%",
          height: "60px",
          marginBottom: "0.5em",
          padding: "8px",
          boxSizing: "border-box",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />

      <button
        onClick={submitComment}
        style={{
          width: "100%",
          padding: "8px",
          boxSizing: "border-box",
          cursor: "pointer",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        送信
      </button>

      {loading && (
        <div style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>読み込み中…</div>
      )}

      {!loading && !comments.length && (
        <div style={{ color: "#aaa", fontSize: 13, marginTop: 8 }}>
          コメントはまだありません。
        </div>
      )}

      {/* コメント一覧だけスクロール */}
      <div
        style={{
          marginTop: "1em",
          maxHeight: "180px",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
          {comments.map((c) => (
            <li
              key={c.id}
              style={{ marginBottom: "0.5em", borderBottom: "1px solid #444" }}
            >
              <strong>
                {c.username}{" "}
                {c.created_at ? new Date(c.created_at).toLocaleString("ja-JP") : ""}
              </strong>
              <br />
              {c.text}
            </li>
          ))}
        </ul>
      </div>
    </NoDragArea>
  );
}
