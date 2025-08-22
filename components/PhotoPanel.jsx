// components/PhotoPanel.jsx
export default function PhotoPanel({ photo, onClose }) {
  if (!photo) return null;

  return (
    <div
      style={{
        width: 360,
        maxWidth: "90vw",
        background: "rgba(0,0,0,0.85)",
        color: "#eee",
        border: "1px solid #333",
        borderRadius: 14,
        boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 12px",
          borderBottom: "1px solid #222",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
          {photo.title || "無題の写真"} {photo.taken_at ? `• ${new Date(photo.taken_at).toLocaleDateString()}` : ""}
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

      <div style={{ maxHeight: 420, background: "#000" }}>
        <img
          src={photo.public_url}
          alt={photo.title || "photo"}
          style={{ display: "block", width: "100%", height: "auto", objectFit: "contain" }}
        />
      </div>

      <div style={{ padding: 12, fontSize: 14, lineHeight: 1.5 }}>
        {photo.description && <p style={{ whiteSpace: "pre-line", margin: 0 }}>{photo.description}</p>}
        <div style={{ marginTop: 10, color: "#aaa", fontSize: 12 }}>
          緯度: {photo.latitude?.toFixed?.(6) ?? photo.lat?.toFixed?.(6) ?? photo.lat}／
          経度: {photo.longitude?.toFixed?.(6) ?? photo.lng?.toFixed?.(6) ?? photo.lng}
        </div>
      </div>
    </div>
  );
}
