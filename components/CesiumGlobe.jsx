import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import PhotoPanel from "./PhotoPanel";

export default function CesiumGlobe({ photos = [] }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const handlerRef = useRef(null);

  // パネル用の状態（選択中の写真 & 表示位置）
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [panelPos, setPanelPos] = useState({ x: 16, y: 72 });

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
      infoBox: false, // ← Cesiumの既定パネルは使わない
      selectionIndicator: false, // ← 緑のエフェクトを消す
    });
    viewerRef.current = viewer;

    // 画面をクッキリ
    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 2);

    // 背景レイヤ（省略可）
    const nasa = viewer.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-12-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg",
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        maximumLevel: 8,
        credit: "NASA Blue Marble (GIBS)",
      })
    );
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

    // 初期視点
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(139.7671, 35.6812, 2_000_000),
      duration: 0.0,
    });

    // クリックでエンティティを拾い、選択写真に反映
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.position);
      if (Cesium.defined(picked) && picked.id?._isPhotoEntity) {
        const p = picked.id.properties?.getValue?.() ?? picked.id._photo; // どちらでも拾えるよう保険
        setSelectedPhoto(p);
        setPanelPos({ x: 16, y: 72 }); // 開く位置はお好みで
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handlerRef.current = handler;

    return () => {
      handler.destroy();
      viewer && !viewer.isDestroyed() && viewer.destroy();
    };
  }, []);

  // 高密度サムネURL（Supabaseの画像変換）を作成
  function thumbUrl(original, w, h = w) {
    try {
      const url = new URL(original);
      url.searchParams.set("width", String(w));
      url.searchParams.set("height", String(h));
      url.searchParams.set("resize", "cover");
      url.searchParams.set("format", "webp");
      url.searchParams.set("quality", "90");
      return url.toString();
    } catch { return original; }
  }

  // photos → Billboard へ反映
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // 既存の写真ピンだけ削除
    viewer.entities.values
      .filter((e) => e._isPhotoEntity)
      .forEach((e) => viewer.entities.remove(e));

    const cssSize = 48;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const texSize = cssSize * dpr;

    const NEAR = 5.0e4;
    const FAR  = 1.5e6;

    photos.forEach((p) => {
      if (p?.lat == null || p?.lng == null || !p.public_url) return;

      const ent = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat),
        billboard: {
          image: thumbUrl(p.public_url, texSize, texSize),
          width: cssSize,
          height: cssSize,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          // 正しい順序: (near, nearValue, far, farValue)
          scaleByDistance: new Cesium.NearFarScalar(NEAR, 1.2, FAR, 0.85),
          translucencyByDistance: new Cesium.NearFarScalar(2.0e5, 1.0, 2.0e6, 0.6),
        },
        properties: { ...p },   // ← クリック時に丸ごと取り出す用
      });
      ent._isPhotoEntity = true;
      ent._photo = p; // propertiesが無いケースの保険
    });
  }, [photos]);

  // パネルをドラッグで動かせるように（任意）
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

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

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
            maxHeight: "80vh", // ← 背高に
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
