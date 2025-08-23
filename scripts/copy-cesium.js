const fs = require("fs");
const path = require("path");

const src = path.join(process.cwd(), "node_modules/cesium/Build/Cesium");
const dst = path.join(process.cwd(), "public/Cesium");

function cp(s, d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  for (const e of fs.readdirSync(s)) {
    const S = path.join(s, e), D = path.join(d, e);
    fs.statSync(S).isDirectory() ? cp(S, D) : fs.copyFileSync(S, D);
  }
}

cp(src, dst);
console.log("Copied Cesium assets to public/Cesium");
