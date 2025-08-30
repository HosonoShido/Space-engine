// components/PhotoUploadForm.jsx
"use client";

import { useState } from "react";
import exifr from "exifr";
import { supabase } from "../lib/supabaseClient";

export default function PhotoUploadForm({ onUploaded, bucket = "photos" }) {
  const [file, setFile] = useState(null);            // 元の選択ファイル
  const [uploadFile, setUploadFile] = useState(null); // 実際にアップロードするファイル（HEICならJPEGに変換したもの）
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const isHeicLike = (f) => {
    if (!f) return false;
    const t = (f.type || "").toLowerCase();
    const n = (f.name || "").toLowerCase();
    return t.includes("heic") || t.includes("heif") || /\.hei[cf]$/i.test(n);
  };

  function dmsToDeg(v, ref) {
    if (!v) return null;
    const toNum = (x) =>
      typeof x === "number"
        ? x
        : x?.numerator !== undefined && x?.denominator
        ? x.numerator / x.denominator
        : Array.isArray(x) && x.length === 2
        ? x[0] / x[1]
        : Number(x);
    const d = toNum(v[0]);
    const m = toNum(v[1]);
    const s = toNum(v[2]);
    if ([d, m, s].some((n) => Number.isNaN(n))) return null;
    let deg = d + m / 60 + s / 3600;
    if (ref && (ref === "S" || ref === "W")) deg = -deg;
    return deg;
  }

  async function extractLatLngFromExif(f) {
    // 1) exifr.gps
    try {
      const g = await exifr.gps(f);
      if (g?.latitude != null && g?.longitude != null) {
        return { lat: g.latitude, lng: g.longitude };
      }
    } catch {}
    // 2) 広めにパース
    try {
      const tags = await exifr.parse(f, { gps: true, exif: true, ifd0: true, xmp: true });
      if (!tags) return null;

      if (tags.latitude != null && tags.longitude != null) {
        return { lat: Number(tags.latitude), lng: Number(tags.longitude) };
      }
      if (tags.GPSLatitude && tags.GPSLongitude) {
        const latRef = tags.GPSLatitudeRef || tags.GPSLatitude?.ref || "N";
        const lngRef = tags.GPSLongitudeRef || tags.GPSLongitude?.ref || "E";
        const latDeg = Array.isArray(tags.GPSLatitude) ? dmsToDeg(tags.GPSLatitude, latRef) : Number(tags.GPSLatitude);
        const lngDeg = Array.isArray(tags.GPSLongitude) ? dmsToDeg(tags.GPSLongitude, lngRef) : Number(tags.GPSLongitude);
        if (Number.isFinite(latDeg) && Number.isFinite(lngDeg)) {
          return { lat: latDeg, lng: lngDeg };
        }
      }
      if (tags.GPS?.Latitude && tags.GPS?.Longitude) {
        return { lat: Number(tags.GPS.Latitude), lng: Number(tags.GPS.Longitude) };
      }
    } catch {}
    return null;
  }

  async function extractTakenAt(f) {
    try {
      const meta = await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate"], exif: true, ifd0: true });
      const dt = meta?.DateTimeOriginal || meta?.CreateDate;
      if (dt instanceof Date) {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch {}
    return "";
  }

  async function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setUploadFile(null);
    setMsg("");

    if (!f) {
      setPreviewUrl("");
      return;
    }

    // まずプレビュー用URLを作る（HEICは後で上書き）
    let localPreview = URL.createObjectURL(f);
    setPreviewUrl(localPreview);

    // 1) EXIF（緯度経度/日付）をまず元ファイルから頑張って読む
    //    ※ HEICの場合、ここで取得できないことが多いです
    try {
      const pos = await extractLatLngFromExif(f);
      if (pos) {
        setLat(pos.lat.toFixed(6));
        setLng(pos.lng.toFixed(6));
      } else {
        setLat(""); setLng("");
      }
    } catch (err) {
      console.warn("GPS read error:", err);
    }
    const taken = await extractTakenAt(f);
    if (taken) setTakenAt(taken);

    // 2) HEIC/HEIFなら JPEG に変換（EXIFは基本的に消えます）
    if (isHeicLike(f)) {
      try {
        if (typeof window === "undefined") {
          // SSR保険（念のため）
          setUploadFile(f);
          return;
        }
        // ✅ クライアント側でだけ読み込む
        const { default: heic2any } = await import("heic2any");
        const jpegBlob = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.92 });
        const outName = f.name.replace(/\.(heic|heif)$/i, ".jpg");
        const jpegFile = new File([jpegBlob], outName, { type: "image/jpeg" });

        // プレビューをJPEGに差し替え
        const prev = URL.createObjectURL(jpegFile);
        setPreviewUrl(prev);

        // アップロード対象をJPEGに
        setUploadFile(jpegFile);

        // もしさっきEXIFが取れていなければ、ここでメッセージ
        setMsg((m) =>
          (m ? m + "\n" : "") +
          "緯度経度が自動取得されないことがあります。必要なら「現在地を使用」か手入力をご利用ください。"
        );
      } catch (err) {
        console.error("HEIC変換失敗:", err);
        setMsg((m) => (m ? m + "\n" : "") + "HEICのJPEG変換に失敗しました。別形式でお試しください。");
        // 変換に失敗した場合はオリジナルをそのままアップロード候補に
        setUploadFile(f);
      }
    } else {
      // JPEG/PNG などはそのままアップロード
      setUploadFile(f);
    }
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setMsg("このブラウザは位置情報に対応していません。");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => setMsg(`位置情報エラー: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function buildSafePath(f) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const ext = (f.name.split(".").pop() || "bin").toLowerCase();
    const uuid = crypto?.randomUUID?.() || String(Date.now());
    return `${yyyy}/${mm}/${uuid}.${ext}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    const f = uploadFile || file;
    if (!f) {
      setMsg("画像ファイルを選択してください。");
      return;
    }
    if (lat === "" || lng === "") {
      setMsg("緯度・経度を入力するか「現在地を使用」を押してください。");
      return;
    }

    setIsUploading(true);
    try {
      const path = buildSafePath(f);

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, f, { upsert: false, contentType: f.type || "application/octet-stream" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const public_url = pub?.publicUrl || null;

      const payload = {
        path,
        public_url,
        title: title || null,
        description: description || null,
        lat: Number(lat),
        lng: Number(lng),
        taken_at: takenAt ? new Date(takenAt).toISOString() : null,
      };
      const { error: insErr } = await supabase.from("photos").insert(payload);
      if (insErr) throw insErr;

      setMsg("✅ アップロードに成功しました！");
      setFile(null);
      setUploadFile(null);
      setPreviewUrl("");
      setTitle("");
      setDescription("");
      setLat("");
      setLng("");
      setTakenAt("");

      onUploaded && onUploaded();
    } catch (err) {
      console.error(err);
      setMsg(`エラー: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div style={{ background: "#111", color: "#eee", padding: 16, borderRadius: 16 }}>
      <h2 style={{ margin: 0, marginBottom: 12 }}>📷 写真を投稿</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>画像ファイル</label>
          <input
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileChange}
          />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              style={{ marginTop: 8, width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 12 }}
            />
          )}
        </div>

        <div style={{ display: "grid", gap: 30, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>説明（任意）</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例：美しい海の景色です"
              style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>撮影日（任意）</label>
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 30, gridTemplateColumns: "1fr 1fr auto" }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>緯度 (lat)</label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="35.xxxxxx"
              style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>経度 (lng)</label>
            <input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="139.xxxxxx"
              style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff", boxSizing: "border-box" }}
            />
          </div>
          <button
            type="button"
            onClick={useCurrentLocation}
            style={{ alignSelf: "end", padding: "8px 12px", borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff", boxSizing: "border-box" }}
          >
            現在地を使用
          </button>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          style={{ padding: "10px 14px", borderRadius: 14, fontWeight: 700, background: "#222", color: "#fff", border: "1px solid #333" }}
        >
          {isUploading ? "アップロード中..." : "アップロード"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 10, color: "#a5f3fc", whiteSpace: "pre-line" }}>{msg}</p>}

      <div style={{ marginTop: 12, color: "red", fontSize: 18, lineHeight: 1.5 }}>
        ⚠️プライベートすぎる写真を投稿する際は、正確な位置情報を入力しないでください。必ず位置情報を省略するか、おおよその場所にしてください。<br />
        例：緯度 35.468083 → 35.4681など<br />
      </div>
    </div>
  );
}
