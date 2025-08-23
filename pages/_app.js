// pages/_app.jsx
import "cesium/Build/Cesium/Widgets/widgets.css"; // ← ここで一括読み込み
export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

