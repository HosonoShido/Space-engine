// components/PhotoUploadForm.jsx
import { useState } from "react";
import * as exifr from "exifr";
import { supabase } from "../lib/supabaseClient";

export default function PhotoUploadForm({ onUploaded, bucket = "photos" }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setMsg("");

    if (!f) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    try {
      const gps = await exifr.gps(f);
      if (gps?.latitude && gps?.longitude) {
        setLat(Number(gps.latitude).toFixed(6));
        setLng(Number(gps.longitude).toFixed(6));
      }
      const exif = await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate"] });
      const dt = exif?.DateTimeOriginal || exif?.CreateDate;
      if (dt instanceof Date) {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        setTakenAt(`${yyyy}-${mm}-${dd}`);
      }
    } catch (err) {
      console.warn("EXIF 読み取りエラー:", err);
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
    const uuid = (crypto?.randomUUID?.() || String(Date.now()));
    return `${yyyy}/${mm}/${uuid}.${ext}`; // ASCII安全キー
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!file) {
      setMsg("画像ファイルを選択してください。");
      return;
    }
    if (lat === "" || lng === "") {
      setMsg("緯度・経度を入力するか「現在地を使用」を押してください。");
      return;
    }

    setIsUploading(true);
    try {
      const path = buildSafePath(file);

      // 1) Storage にアップロード（Public バケット想定）
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      // 2) Public URL 取得
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const public_url = pub?.publicUrl || null;

      // 3) DBへメタ保存（public_url を保存）
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
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              style={{ marginTop: 8, width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 12 }}
            />
          )}
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>タイトル（任意）</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：逗子の海"
              style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>撮影日（任意）</label>
            <input
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff" }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6 }}>説明（任意）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="メモや場所の補足など"
            rows={3}
            style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff" }}
          />
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr auto" }}>
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>緯度 (lat)</label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="35.xxxxxx"
              style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff" }}
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
              style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff" }}
            />
          </div>
          <button
            type="button"
            onClick={useCurrentLocation}
            style={{ alignSelf: "end", padding: "8px 12px", borderRadius: 10, border: "1px solid #333", background: "#000", color: "#fff" }}
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

      <div style={{ marginTop: 12, color: "#aaa", fontSize: 12, lineHeight: 1.5 }}>
        ※ iOSの共有設定で位置情報を削除していると EXIF GPS は入っていない場合があります。<br />
        ※ Public バケットなので `public_url` をそのまま表示に使えます。
      </div>
    </div>
  );
}
