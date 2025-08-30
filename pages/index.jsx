// pages/index.jsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";

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



  return (
    <div style={{ position: "fixed", inset: 0, height: "100dvh", overflowY: "auto" }}>
      <CesiumGlobe photos={photos} />
    </div>
  );
}
