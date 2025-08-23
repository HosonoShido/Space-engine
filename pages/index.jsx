// pages/index.jsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import PhotoUploadForm from "../components/PhotoUploadForm";

const CesiumGlobe = dynamic(() => import("../components/CesiumGlobe"), { ssr: false });

export default function Home() {
  const [photos, setPhotos] = useState([]);

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
    await loadPhotos(); // 投稿後に反映
  };

  return (
    <div style={{ backgroundColor: "black", minHeight: "100vh", overflow: "hidden" }}>
      <h1 style={{ color: "white", padding: 16 }}>🌍 フォト地球儀 </h1>

      <div style={{ padding: "0 16px 16px" }}>
        <PhotoUploadForm onUploaded={handleUploaded} />
      </div>

      <CesiumGlobe photos={photos} />
    </div>
  );
}
