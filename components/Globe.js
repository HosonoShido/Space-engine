import { useEffect, useRef, useState } from "react"
import countryCodeToEmoji from "./countryCodeToEmoji"
import CompanyInfo from "./CompanyInfo";


export default function GlobeComponent({points}=[]){
  const globeRef = useRef(null)
  const[isClient, setIsClient] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(()=>{
    setIsClient(true)
  },[])

  useEffect(() => {
    if (!isClient) return

    import ("globe.gl").then(Globe =>{
      const maxIndex = points.length - 1;
      const globe = Globe.default()(globeRef.current)
        .globeImageUrl("https://upload.wikimedia.org/wikipedia/commons/0/04/Solarsystemscope_texture_8k_earth_daymap.jpg")
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .pointsData(points)
        .pointLat(d => d.latitude)
        .pointLng(d => d.longitude)
        .pointColor(() => 'pink')
        .pointAltitude(0.01)
        .pointLabel("")

        .htmlElementsData(points)
        .htmlLat(d => d.latitude)
        .htmlLng(d => d.longitude)
        // .htmlAltitude(d => 0 + 0.01 * (maxIndex - d.id))
        .htmlElement(d => {
          const div = document.createElement('div');
          div.style.color = 'lightgreen';
          div.style.font = '20px "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
          div.style.whiteSpace = 'nowrap';
          div.innerText = `${d.name}${countryCodeToEmoji(d.flag_code)}`;
          div.style.cursor = 'pointer';
          div.style.pointerEvents = 'auto';
          div.style.zIndex = '10';
          const handler = (e) => {
            e.stopPropagation(); // 他のイベントに干渉させない
            setSelectedCompany(d);
          };
          div.addEventListener('click', handler);
          div.addEventListener('touchstart', handler);

          return div;
        })

      globe.controls().enableZoom = true
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 10
    })
  },[isClient, points])
  
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={globeRef} style={{ width: "100vw", height: "100vh" }} />
       <CompanyInfo company={selectedCompany}/>
    </div>
  );
}
