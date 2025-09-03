// components/PhotoUploadForm.jsx
"use client";

import { useRef, useState, useEffect } from "react";
import exifr from "exifr";
import { supabase } from "../lib/supabaseClient";

export default function PhotoUploadForm({ onUploaded, bucket = "photos" }) {
  const [file, setFile] = useState(null);             // 元の選択ファイル
  const [uploadFile, setUploadFile] = useState(null); // 実際にアップロードするファイル（HEICならJPEGに変換したもの）
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState("");

  // ▼ 追加
  const [isConverting, setIsConverting] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const prevUrlRef = useRef(null); // 直前のObjectURLを破棄するため

  useEffect(() => {
    if (
      (uploadFile || file) &&  // ファイルがある
      lat &&                   // 緯度がある
      lng &&                   // 経度がある
      imgLoaded &&             // プレビューが読み込まれた
      !isConverting            // 変換中ではない
    ) {
      setMsg("投稿準備完了です！");
    } else {
      setMsg(""); // 条件がそろっていない間は空
    }
  }, [file, uploadFile, lat, lng, imgLoaded, isConverting]);

  // 追加: フォーム内でのEnter送信をブロック
  function handleKeyDown(e) {
    // 日本語入力の確定中は除外（変換確定Enterで誤ブロックしない）
    if (e.isComposing) return;

    if (e.key === "Enter") {
      const tag = e.target.tagName.toLowerCase();
      const type = (e.target.type || "").toLowerCase();

      // Enterを許可するケース（必要なら調整）
      const isTextarea = tag === "textarea";
      const isSubmitOrButton = tag === "button" || type === "submit" || type === "button";

      // 上記以外（input=number/date/textなど）では送信させない
      if (!isTextarea && !isSubmitOrButton) {
        e.preventDefault(); // ここで送信を止める
      }
    }
  }


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
    try {
      const g = await exifr.gps(f);
      if (g?.latitude != null && g?.longitude != null) {
        return { lat: g.latitude, lng: g.longitude };
      }
    } catch {}
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
    setLat("");
    setLng("");
    setTakenAt("");
    setImgLoaded(false);
    setMsg("");
    // HEIC なら「変換中」を先に立てておく（readyを阻止）
    setIsConverting(isHeicLike(f));

    // 既存プレビューURLの破棄（メモリ節約）
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }

    if (!f) {
      setPreviewUrl("");
      setImgLoaded(false);
      return;
    }

    // ▼ 画像読み込み状態をリセット（ここから“くるくる”発動条件になる）
    setImgLoaded(false);

    // まずローカルプレビュー表示（HEICでも一旦表示しておく。後で差し替え）
    const localPreview = URL.createObjectURL(f);
    prevUrlRef.current = localPreview;
    setPreviewUrl(localPreview);

    // EXIF（緯度経度/日付）
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

    // HEICならJPEGに変換してプレビュー＆アップロード対象を差し替える
    if (isHeicLike(f)) {
      try {
        setIsConverting(true);
        if (typeof window === "undefined") {
          setUploadFile(f);
          setIsConverting(false);
          return;
        }
        const { default: heic2any } = await import("heic2any");
        const jpegBlob = await heic2any({ blob: f, toType: "image/jpeg", quality: 0.92 });
        const outName = f.name.replace(/\.(heic|heif)$/i, ".jpg");
        const jpegFile = new File([jpegBlob], outName, { type: "image/jpeg" });

        // 旧URL破棄→新URL発行
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        const prev = URL.createObjectURL(jpegFile);
        prevUrlRef.current = prev;

        setPreviewUrl(prev);
        setUploadFile(jpegFile);
      } catch (err) {
        console.error("HEIC変換失敗:", err);
        setMsg((m) => (m ? m + "\n" : "") + "HEICのJPEG変換に失敗しました。別形式でお試しください。");
        setUploadFile(f);
      } finally {
        setIsConverting(false);
      }
    } else {
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
    setMsg("");
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
    // ボタンクリック以外（Enterなど）を無効化
    const submitter = e.nativeEvent?.submitter;
      if (!submitter || submitter.name !== "postBtn") {
        return; // 何もせず終了
      }

    setMsg("");

    const f = uploadFile || file;
    if (!f) {
      setMsg("画像ファイルを選択してください。");
      return;
    }
    if (lat === "" || lng === "") {
      setMsg("緯度経度が自動取得されないことがあります。必要なら「現在地を使用」か手入力をご利用ください。");
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
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }

      onUploaded && onUploaded();
    } catch (err) {
      console.error(err);
      setMsg(`エラー: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
    }
  }

  // ▼ ここで“くるくる表示中か”を一元化
  const showSpinner = !!previewUrl && (!imgLoaded || isConverting);

  return (
    <div style={{ background: "#111", color: "#eee", padding: 16, borderRadius: 16 }}>
      <h2 style={{ margin: 0, marginBottom: 12}}>📷 写真を投稿
        <div style={{ color: "red", fontSize: 12 }}>
          ⚠️プライベートな写真は正確な位置情報を入れないでください！
          例：35.468083 → 35.4681
        </div>
      </h2>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>画像ファイル</label>
          <input
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileChange}
          />

          {/* ▼ プレビュー枠（サイズは既存のまま） */}
          {previewUrl && (
            <div style={{ position: "relative", marginTop: 8 }}>
              {/* 画像（onLoadで読み込み完了を検知） */}
              <img
                src={previewUrl}
                alt=""
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)} // エラーでもスピナーは止める
                style={{
                  width: "100%",
                  maxHeight: 160,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />

              {/* 読み込み中オーバーレイ（SVGスピナー） */}
              {showSpinner && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderRadius: 8,
                  }}
                >
                  <span>読み込み中です</span>
                  <svg width="20" height="20" viewBox="0 0 50 50" aria-hidden="true">
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="90,150"
                      strokeDashoffset="0"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 25 25"
                        to="360 25 25"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>
                </div>
              )}
            </div>
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
          name="postBtn" // クリックされたボタンを識別するための名前
          type="submit"
          disabled={isUploading || isConverting}
          aria-busy={isUploading || isConverting}
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            fontWeight: 700,
            background: "#222",
            color: "#fff",
            border: "1px solid #333",
            opacity: (isUploading || isConverting) ? 0.8 : 1,
            cursor: (isUploading || isConverting) ? "not-allowed" : "pointer",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              // ラベル切替でも幅がブレにくいよう、最小幅を少し確保（任意）
              minWidth: 110,
              justifyContent: "center",
            }}
          >
            <span>
              {isConverting
                ? ""
                : isUploading
                ? "投稿中..."
                : "投稿する"}
            </span>
            {(isUploading || isConverting) && (
              // 小さなSVGスピナー（CSS不要・単体で回転）
              <svg
                width="16" height="16" viewBox="0 0 16 16"
                role="img" aria-label="loading"
              >
                <circle
                  cx="8" cy="8" r="6"
                  stroke="#fff" strokeWidth="2"
                  fill="none" strokeLinecap="round"
                  strokeDasharray="28" strokeDashoffset="18"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 8 8"
                    to="360 8 8"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>
            )}
          </span>
        </button>

      </form>

      {msg && <p style={{ marginTop: 10, color: "#a5f3fc", whiteSpace: "pre-line" }}>{msg}</p>}
    </div>
  );
}
