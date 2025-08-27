// components/PhotoPanel.jsx
"use client";

import CommentBox from "./CommentBox";

export default function PhotoPanel({ photo, onClose }) {
  if (!photo) return null;

  return (
    <div
      style={{
        width: 360,
        maxWidth: "100vw",
        background: "rgba(0,0,0,0.85)",
        color: "#eee",
        border: "1px solid #333",
        borderRadius: 14,
        boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
        // ★ パネル全体は画面内で固定し、縦に並べる
        height: "90vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ヘッダー（常に表示） */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 12px",
          borderBottom: "1px solid #222",
          flex: "0 0 auto",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>
          {photo.taken_at ? `${new Date(photo.taken_at).toLocaleDateString("ja-JP")}` : ""}
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: "#ccc",
            fontSize: 18,
            cursor: "pointer",
          }}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {/* 画像（常に表示） */}
      <div style={{ background: "#000", flex: "0 0 auto" }}>
        <img
          src={photo.public_url}
          alt={photo.title || "photo"}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            objectFit: "contain",
            maxHeight: 360, // ★必要なら調整（写真エリアの上限）
          }}
        />
      </div>

      {/* 本文・メタ（常に表示） */}
      <div style={{ padding: 12, fontSize: 14, lineHeight: 1.5, flex: "0 0 auto" }}>
        {photo.description && (
          <p style={{ whiteSpace: "pre-line", margin: 0 }}>{photo.description}</p>
        )}
        <div style={{ marginTop: 10, color: "#aaa", fontSize: 12 }}>
          緯度: {photo.latitude?.toFixed?.(6) ?? photo.lat?.toFixed?.(6) ?? photo.lat}／
          経度: {photo.longitude?.toFixed?.(6) ?? photo.lng?.toFixed?.(6) ?? photo.lng}
        </div>
      </div>

      {/* 仕切り線 */}
      <div style={{ borderTop: "1px solid #222", flex: "0 0 auto" }} />

      {/* ★ コメント欄だけスクロールさせる */}
      <div
        style={{
          padding: 12,
          display: "grid",
          gap: 12,
          flex: "1 1 auto",
          overflowY: "auto",
          minHeight: 0, // ★overflowを効かせるための安定化
        }}
      >
        <CommentBox targetType="photos" targetId={photo.id} />
      </div>
    </div>
  );
}
