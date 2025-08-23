// next.config.mjs
import CopyWebpackPlugin from 'copy-webpack-plugin';

const nextConfig = {
  env: {
    CESIUM_BASE_URL: '/cesium', // ← これ大事
  },
  webpack: (config) => {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          { from: 'node_modules/cesium/Build/Cesium/Workers',   to: 'public/cesium/Workers',   info: { minimized: true } },
          { from: 'node_modules/cesium/Build/Cesium/ThirdParty',to: 'public/cesium/ThirdParty',info: { minimized: true } },
          { from: 'node_modules/cesium/Build/Cesium/Assets',    to: 'public/cesium/Assets',    info: { minimized: true } },
          { from: 'node_modules/cesium/Build/Cesium/Widgets',   to: 'public/cesium/Widgets',   info: { minimized: true } },
        ],
      })
    );
    return config;
  },
};
export default nextConfig;

