// components/GlobePhotos.jsx
import { useEffect, useRef, useState } from "react";
import PhotoPanel from "./PhotoPanel";

// photos: [{ id, title, description, lat, lng, public_url, taken_at }, ...]
export default function GlobePhotos({ photos = [] }) {
  const globeRef = useRef(null);
  const panelRef = useRef(null);

  const [isClient, setIsClient] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [panelPos, setPanelPos] = useState({ x: 32, y: 64 }); // パネル位置(px)

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    // globe.gl は SSR 環境だと import に失敗するので動的import
    import("globe.gl").then((GlobeMod) => {
      const g = GlobeMod.default()(globeRef.current)
        .globeImageUrl(
          "https://upload.wikimedia.org/wikipedia/commons/0/04/Solarsystemscope_texture_8k_earth_daymap.jpg"
        )
        .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")

        // 1) 点データ（小さな光る点）
        .pointsData(photos)
        .pointLat((d) => d.lat ?? d.latitude)
        .pointLng((d) => d.lng ?? d.longitude)
        .pointColor(() => "pink")
        .pointAltitude(0.01)
        .pointLabel((d) => d.title || "photo")

        // 2) htmlElements（サムネイル風マーカー）
        .htmlElementsData(photos)
        .htmlLat((d) => d.lat ?? d.latitude)
        .htmlLng((d) => d.lng ?? d.longitude)
        .htmlElement((d) => {
          // 小さい丸型のプレビュー（画像があるなら背景に）
          const div = document.createElement("div");
          div.style.width = "36px";
          div.style.height = "36px";
          div.style.borderRadius = "50%";
          div.style.border = "2px solid rgba(255,255,255,0.7)";
          div.style.boxShadow = "0 0 8px rgba(255,105,180,0.6)";
          div.style.cursor = "pointer";
          div.style.pointerEvents = "auto";
          div.style.zIndex = "10";
          div.style.background = d.public_url
            ? `url("${d.public_url}") center/cover no-repeat`
            : "radial-gradient(circle, #ffc0cb 0%, #ff69b4 60%, #d63384 100%)";

          const handler = (e) => {
            e.stopPropagation();
            setSelectedPhoto({
              ...d,
              latitude: d.lat ?? d.latitude,
              longitude: d.lng ?? d.longitude,
            });
            setPanelPos({ x: 32, y: 64 }); // 基準位置
          };
          div.addEventListener("pointerdown", handler);
          return div;
        });

      // 操作設定
      g.controls().enableZoom = true;
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0;
    });
  }, [isClient, photos]);

  // 入力系はドラッグ無効
  const isInteractive = (el) =>
    !!el && !!el.closest('input, textarea, select, button, a, [contenteditable="true"], [data-no-drag]');

  const startDrag = (e) => {
    e.stopPropagation();
    if (isInteractive(e.target)) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = panelPos.x;
    const baseY = panelPos.y;

    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId != null) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setPanelPos({ x: baseX + dx, y: baseY + dy });
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={globeRef} style={{ width: "100vw", height: "100vh" }} />

      {selectedPhoto && (
        <div
          ref={panelRef}
          onPointerDown={startDrag}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: panelPos.x,
            top: panelPos.y,
            zIndex: 10000,
            userSelect: "none",
            touchAction: "none",
            cursor: "grab",
          }}
        >
          <PhotoPanel photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
        </div>
      )}
    </div>
  );
}
