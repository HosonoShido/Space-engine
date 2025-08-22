import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import GlobePhotos from "../components/GlobePhotos";   // ← ここを変更
import PhotoUploadForm from "../components/PhotoUploadForm";

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
    setPhotos(
      (data || []).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        lat: p.lat,
        lng: p.lng,
        public_url: p.public_url,
        taken_at: p.taken_at,
      }))
    );
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleUploaded = async () => {
    await loadPhotos(); // 投稿後に最新を読み直す
  };

  return (
    <div style={{ backgroundColor: "black", minHeight: "100vh", padding: 16 }}>
      <h1 style={{ color: "white" }}>🌎 フォト地球儀</h1>

      <div style={{ marginBottom: 16 }}>
        <PhotoUploadForm onUploaded={handleUploaded} />
      </div>

      <GlobePhotos photos={photos} />
    </div>
  );
}
