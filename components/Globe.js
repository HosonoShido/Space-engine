import { useEffect, useRef, useState } from "react";
import countryCodeToEmoji from "./countryCodeToEmoji";
import CompanyInfo from "./CompanyInfo";

export default function Globe({ points = [] }) {
  const globeRef = useRef(null);
  const panelRef = useRef(null);

  const [isClient, setIsClient] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [panelPos, setPanelPos] = useState({ x: 32, y: 64 }); // パネル位置(px)

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    import("globe.gl").then((GlobeMod) => {
      const globe = GlobeMod.default()(globeRef.current)
        .globeImageUrl(
          "https://upload.wikimedia.org/wikipedia/commons/0/04/Solarsystemscope_texture_8k_earth_daymap.jpg"
        )
        .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
        .pointsData(points)
        .pointLat((d) => d.latitude)
        .pointLng((d) => d.longitude)
        .pointColor(() => "pink")
        .pointAltitude(0.01)
        .pointLabel("")
        .htmlElementsData(points)
        .htmlLat((d) => d.latitude)
        .htmlLng((d) => d.longitude)
        .htmlElement((d) => {
          const div = document.createElement("div");
          div.style.color = "lightgreen";
          div.style.font = '20px "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
          div.style.whiteSpace = "nowrap";
          div.style.cursor = "pointer";
          div.style.pointerEvents = "auto";
          div.style.zIndex = "10";
          div.innerText = `${d.name}${countryCodeToEmoji(d.flag_code)}`;

          const handler = (e) => {
            e.stopPropagation();
            setSelectedCompany(d);
            setPanelPos({ x: 32, y: 64 }); // フォールバック
          };
          div.addEventListener("pointerdown", handler);
          return div;
        });

      globe.controls().enableZoom = true;
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 1;
    });
  }, [isClient, points]);

  // 入力など「ドラッグ無効」にしたい要素かを判定
  const isInteractive = (el) =>
    !!el && !!el.closest('input, textarea, select, button, a, [contenteditable="true"], [data-no-drag]');

  // ドラッグ開始（コメント欄などの入力は除外）
  const startDrag = (e) => {
    e.stopPropagation(); // 背景の閉じるを防ぐ
    if (isInteractive(e.target)) return; // 入力要素ならドラッグしない

    const rect = panelRef.current ? panelRef.current.getBoundingClientRect() : null;
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = panelPos.x;
    const baseY = panelPos.y;

    // pointer capture（対応ブラウザのみ）
    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId != null) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setPanelPos({ x: baseX + dx, y: baseY + dy }); // 制限なしで移動
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      style={{ position: "relative", width: "100vw", height: "100vh" }}
    >
      <div ref={globeRef} style={{ width: "100vw", height: "100vh" }} />

      {selectedCompany && (
        <div
          ref={panelRef}
          onPointerDown={startDrag}            // コメント欄以外ならドラッグ開始
          onClick={(e) => e.stopPropagation()} // パネル内クリックでは閉じない
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
          <CompanyInfo
            company={selectedCompany}
            onClose={() => setSelectedCompany(null)} // ×ボタンで閉じる
          />
        </div>
      )}
    </div>
  );
}
