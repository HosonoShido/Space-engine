import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import PhotoPanel from "./PhotoPanel";

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

  // --- photosプロパティの変更を監視してBillboardを更新 ---
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.values
      .filter((e) => e._isPhotoEntity)
      .forEach((e) => viewer.entities.remove(e));

    const cssSize = 48;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const texSize = cssSize * dpr;
    const NEAR = 5.0e4;
    const FAR  = 1.5e6;

    const thumbUrl = (original, w, h = w) => {
      try {
        const url = new URL(original);
        url.searchParams.set("width", String(w));
        url.searchParams.set("height", String(h));
        url.searchParams.set("resize", "cover");
        url.searchParams.set("format", "webp");
        url.searchParams.set("quality", "90");
        return url.toString();
      } catch { return original; }
    };

    photos.forEach((p) => {
      if (p?.lat == null || p?.lng == null || !p.public_url) return;
      const ent = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat),
        billboard: {
          image: thumbUrl(p.public_url, texSize, texSize),
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
    });
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

  // --- レンダリング ---
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
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
            maxHeight: "80vh",
            overflow: "hidden",
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
