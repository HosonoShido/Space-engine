// components/PhotoMap.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Supercluster from "supercluster";
import { supabase } from "../lib/supabaseClient";

// Leaflet の画像パス警告を回避（今回は divIcon なので実質未使用だが念のため）
delete L.Icon.Default.prototype._getIconUrl;

function useDebouncedCallback(cb, delay = 300) {
  const t = useRef(null);
  return (...args) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => cb(...args), delay);
  };
}

function photoToGeoJSON(pt) {
  return {
    type: "Feature",
    properties: {
      id: pt.id,
      title: pt.title,
      description: pt.description,
      public_url: pt.public_url,
      taken_at: pt.taken_at
    },
    geometry: { type: "Point", coordinates: [pt.lng, pt.lat] }
  };
}

function createThumbDivIcon(url, size = 40) {
  const html =
    `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      border:2px solid rgba(255,255,255,.8);box-shadow:0 0 8px rgba(0,0,0,.4);
      background:url('${url}') center/cover no-repeat;background-color:#111;
    "></div>`;
  return L.divIcon({ html, className: "", iconSize: [size, size] });
}

function createClusterDivIcon(count, size = 44) {
  const html =
    `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;
      background:radial-gradient(circle at 30% 30%, #ff93c6, #ff3d9a);
      box-shadow:0 0 10px rgba(255,61,154,.6);
      border:2px solid rgba(255,255,255,.85);
    ">${count}</div>`;
  return L.divIcon({ html, className: "", iconSize: [size, size] });
}

export default function PhotoMap({ initialCenter = [35.6812, 139.7671], initialZoom = 13 }) {
  const [photos, setPhotos] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [zoom, setZoom] = useState(initialZoom);
  const [bounds, setBounds] = useState(null);
  const [loading, setLoading] = useState(false);

  // クラスタ作成
  const supercluster = useMemo(() => {
    const fc = { type: "FeatureCollection", features: photos.map(photoToGeoJSON) };
    return new Supercluster({ radius: 60, maxZoom: 20, minPoints: 3 }).load(fc.features);
  }, [photos]);

  // 表示範囲のクラスタを更新
  useEffect(() => {
    if (!bounds || !supercluster) return;
    const [[south, west], [north, east]] = [
      [bounds.getSouth(), bounds.getWest()],
      [bounds.getNorth(), bounds.getEast()]
    ];
    const tiles = supercluster.getClusters([west, south, east, north], Math.round(zoom));
    setClusters(tiles);
  }, [bounds, zoom, supercluster]);

  // 地図イベント（移動/ズームで bbox 取得 → Supabase から取得）
  function MapEvents() {
    const debounced = useDebouncedCallback((map) => {
      const b = map.getBounds();
      const z = map.getZoom();
      setBounds(b);
      setZoom(z);
      fetchByBBox(b, z);
    }, 350);

    useMapEvents({
      load() { debounced(this); },
      moveend() { debounced(this); },
      zoomend() { debounced(this); }
    });
    return null;
  }

  async function fetchByBBox(b, z) {
    if (!b) return;
    setLoading(true);
    try {
      const south = b.getSouth();
      const west  = b.getWest();
      const north = b.getNorth();
      const east  = b.getEast();

      const limit = z <= 6 ? 500 : z <= 10 ? 2000 : 8000;

      const { data, error } = await supabase
        .from("photos")
        .select("id,title,description,lat,lng,public_url,taken_at")
        .gte("lat", south).lte("lat", north)
        .gte("lng", west).lte("lng", east)
        .limit(limit);

      if (error) throw error;
      setPhotos(data || []);
    } catch (e) {
      console.error("fetchByBBox error:", e);
    } finally {
      setLoading(false);
    }
  }

  function onClusterClick(cluster, map) {
    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20);
    const [lng, lat] = cluster.geometry.coordinates;
    map.setView([lat, lng], expansionZoom, { animate: true });
  }

  // SSR ガード（これが無いと Next のサーバ側で window 参照されて落ちることがあります）
  if (typeof window === "undefined") return null;

  return (
    <div style={{ width: "100%", height: "calc(100vh - 140px)", position: "relative" }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ width: "100%", height: "100%", background: "#000" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents />

        {clusters.map((f) => {
          const [lng, lat] = f.geometry.coordinates;
          const isCluster = f.properties.cluster === true;
          if (isCluster) {
            const count = f.properties.point_count;
            return (
              <Marker
                key={`c-${f.id}`}
                position={[lat, lng]}
                icon={createClusterDivIcon(count)}
                eventHandlers={{ click: (e) => onClusterClick(f, e.target._map) }}
              />
            );
          } else {
            const p = f.properties;
            const icon = createThumbDivIcon(p.public_url, 42);
            return (
              <Marker key={`p-${p.id}`} position={[lat, lng]} icon={icon}>
                <Popup>
                  <div style={{ maxWidth: 260 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      {p.title || "無題"} {p.taken_at ? "・" + new Date(p.taken_at).toLocaleString() : ""}
                    </div>
                    <img
                      src={p.public_url}
                      alt={p.title || "photo"}
                      style={{ width: "100%", height: "auto", borderRadius: 8, marginBottom: 8 }}
                    />
                    {p.description && <div style={{ whiteSpace: "pre-line", fontSize: 12 }}>{p.description}</div>}
                  </div>
                </Popup>
              </Marker>
            );
          }
        })}
      </MapContainer>

      <div style={{
        position: "absolute", top: 8, left: 8,
        background: "rgba(0,0,0,.6)", color: "#fff",
        padding: "6px 10px", borderRadius: 12, fontSize: 12
      }}>
        {loading ? "読み込み中…" : `写真: ${photos.length}件（描画: ${clusters.length}）`}
      </div>
    </div>
  );
}
