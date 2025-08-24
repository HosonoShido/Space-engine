// pages/index.jsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import PhotoUploadForm from "../components/PhotoUploadForm";

const CesiumGlobe = dynamic(() => import("../components/CesiumGlobe"), { ssr: false });

export default function Home() {
  const [photos, setPhotos] = useState([]);
  const [showForm, setShowForm] = useState(false);

  async function loadPhotos() {
    const { data, error } = await supabase
      .from("photos")
      .select("id, title, description, lat, lng, public_url, taken_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("photos load error:", error);
      return;
    }
    setPhotos(data ?? []);
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleUploaded = async () => {
    await loadPhotos();
    setShowForm(false);
  };

  return (
    <div style={{ backgroundColor: "black", minHeight: "100vh", overflow: "hidden" }}>
      {/* タイトルとボタンを横並び */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px" }}>
        <p style={{ color: "white", margin: 0, paddingRight: 12 }}>🌍 フォト地球儀</p>

        <button
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          style={{
            background: "rgba(42, 42, 42, 0.8)", // ← 回転ボタンと統一
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

      {/* 投稿フォーム */}
      {showForm && (
        <div style={{ marginTop: 12, paddingLeft: 16, paddingRight: 16 }}>
          <PhotoUploadForm onUploaded={handleUploaded} />
        </div>
      )}

      <CesiumGlobe photos={photos} />
    </div>
  );
}
