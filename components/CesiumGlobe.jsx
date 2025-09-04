import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import PhotoPanel from "./PhotoPanel";
import PhotoUploadForm from "./PhotoUploadForm";


export default function CesiumGlobe({ photos = [] }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [panelPos, setPanelPos] = useState({ x: 16, y: 72 });

  const isInteractingRef = useRef(false);

  // Cesiumビューアの初期化
  useEffect(() => {
    window.CESIUM_BASE_URL = "/Cesium";

    const viewer = new Cesium.Viewer(containerRef.current, {
      imageryProvider: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      baseLayerPicker: false,
      geocoder: false,
      animation: false,
      timeline: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: true,
      requestRenderMode: false,
      homeButton: false,
    });
    viewerRef.current = viewer;
    viewer.scene.globe.enableLighting = false;
    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);

    const c = viewer.scene.screenSpaceCameraController;
    c.inertiaSpin = 0.2;
    c.inertiaZoom = 0.2;
    c.inertiaTranslate = 0.2;
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

    // --- 地球のレイヤー設定 ---
    const nasa = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-12-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 8,
        credit: "NASA Blue Marble (GIBS)",
      })
    );
    nasa.brightness = 2.0;

    const voyager = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: "https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"],
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        credit: "© OpenStreetMap contributors © Carto",
      })
    );

    const hFar = 700_000, hNear = 10_000;
    viewer.scene.postRender.addEventListener(() => {
      const h = viewer.camera.positionCartographic.height;
      let t = (hFar - h) / (hFar - hNear);
      t = Math.max(0, Math.min(1, t));
      voyager.alpha = t; nasa.alpha = 1 - t;
    });

    // --- クリックイベント ---
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id?._isPhotoEntity) {
        const p = picked.id.properties?.getValue?.(viewer.clock.currentTime) ?? picked.id._photo;
        setSelectedPhoto(p);
        setPanelPos({ x: 16, y: 72 });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // --- 初期カメラ位置 ---
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(139.7671, 35.6812, 20_000_000),
      duration: 0.0,
    });

    // --- クリーンアップ処理 ---
    return () => {
      handler && handler.destroy();
      viewer && !viewer.isDestroyed() && viewer.destroy();
    };
  }, []);

  function downscaleInBrowser(src, maxPx = 160, mime = "image/webp", quality = 0.82) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        const { naturalWidth: w0, naturalHeight: h0 } = img;
        if (!w0 || !h0) return resolve(src);
        const scale = Math.min(1, maxPx / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * scale));
        const h = Math.max(1, Math.round(h0 * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        try {
          if ("createImageBitmap" in window) {
            const bmp = await createImageBitmap(img, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
            ctx.drawImage(bmp, 0, 0, w, h);
          } else {
            ctx.drawImage(img, 0, 0, w, h);
          }
        } catch {
          ctx.drawImage(img, 0, 0, w, h);
        }
        try {
          const dataUrl = canvas.toDataURL(mime, quality);
          resolve(dataUrl || src);
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }

  // --- photosプロパティの変更を監視してBillboardを更新 ---
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let alive = true;

    viewer.entities.values
      .filter((e) => e._isPhotoEntity)
      .forEach((e) => viewer.entities.remove(e));

    const cssSize = 48;
    const dpr = Math.max(1, Math.min(2,window.devicePixelRatio || 1));
    const texSize = cssSize * dpr;

    //サムネの最大ピクセルをハード上限（例: 128px）に固定して“原寸を取らない”
    const THUMB_MAX = 160;
    const thumbPx = Math.min(texSize, THUMB_MAX);

    const NEAR = 5.0e4;
    const FAR  = 1.5e6;

    async function resolveThumbSrc(publicUrl, targetPx) {
      // HEICはブラウザ非対応 → プレースホルダ
      if (/\.(heic|heif)$/i.test(publicUrl)) {
        return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='48' height='48' fill='%232a2a2a'/></svg>";
      }
      return await downscaleInBrowser(publicUrl, Math.min(targetPx, THUMB_MAX));
    }

    photos.forEach((p) => {
      if (p?.lat == null || p?.lng == null || !p.public_url) return;
      const ent = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat),
        billboard: {
          image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='48' height='48' fill='%232a2a2a'/></svg>",
          width: cssSize,
          height: cssSize,
          color: Cesium.Color.WHITE.withAlpha(1.0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(NEAR, 1.2, FAR, 0.85),
        },
        properties: { ...p },
      });
      ent._isPhotoEntity = true;
      ent._photo = p;
      resolveThumbSrc(p.public_url, texSize).then((src) => {
        if (!alive) return; // StrictModeでunmount後の反映を防止
        if (!viewer.isDestroyed() && ent.billboard) {
          ent.billboard.image = src;
        }
      });
  });
  return () => { alive = false; };
}, [photos]);

  // --- パネルのドラッグ処理 ---
  function onPanelPointerDown(e) {
    const start = { x: e.clientX, y: e.clientY };
    const base = { ...panelPos };
    function move(ev) {
      setPanelPos({ x: base.x + (ev.clientX - start.x), y: base.y + (ev.clientY - start.y) });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const [showForm, setShowForm] = useState(false);
  const handleUploaded = async () => {
    setShowForm(false);
  };


  // --- レンダリング ---
  return (
    <div style={{ position: "fixed", inset: 0, width: "100%", height: "100dvh", overflow: "clip" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 16,
        }}
      >
        <p style={{ color: "white", margin: 0, paddingRight: 12 }}>🌍 hotospot.com</p>

        <button
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          style={{
            background: "rgba(42, 42, 42, 0.8)", // 回転ボタンと統一
            color: "white",
            border: "1px solid #666",
            borderRadius: "4px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          {showForm ? "閉じる" : "投稿する"}
        </button>
      </div>

      {/* 投稿フォーム（重ねて表示） */}
      {showForm && (
        <div
          style={{
            position: "absolute",
            top: "50%",         // ヘッダーの下あたり
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10000,
            background: "rgba(0,0,0,0.7)",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 12,
            maxHeight: "80dvh",
            width: "90%",
            overflowY: "auto",
            overscrollBehavior: "contain",
            backdropFilter: "blur(2px)",
          }}
        >
          <PhotoUploadForm onUploaded={handleUploaded} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 10000,
          display: "flex",
          gap: "8px",
        }}
      >
        {/* ホームボタンのみ */}
        <button
          onClick={() => {
            const viewer = viewerRef.current;
            if (viewer) {
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(139.7671, 35.6812, 20_000_000),
                duration: 1.5,
              });
            }
          }}
          style={{
            background: "rgba(42, 42, 42, 0.8)",
            color: "white",
            border: "1px solid #666",
            borderRadius: "4px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          🏠 ホーム
        </button>
      </div>

      {selectedPhoto && (
        <div
          onPointerDown={onPanelPointerDown}
          style={{
            position: "fixed",
            left: panelPos.x,
            top: panelPos.y,
            zIndex: 10000,
            cursor: "grab",
            userSelect: "none",
            touchAction: "none",
            maxHeight: "100vh",
            overflowY: "auto",
          }}
        >
          <PhotoPanel
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
          />
        </div>
      )}
    </div>
  );
}
