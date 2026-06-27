// scripts/pwa-postbuild.js
// เติม PWA manifest + meta ลงใน dist (เว็บ export ของ Expo) → ติดตั้งลงเครื่องได้
// รันหลัง `expo export -p web`
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(dist)) { console.error('no dist/ — run expo export -p web first'); process.exit(1); }

// 1) ไอคอน PWA (ใช้ไอคอนแอป)
const iconSrc = path.join(__dirname, '..', 'assets', 'icon.png');
if (fs.existsSync(iconSrc)) fs.copyFileSync(iconSrc, path.join(dist, 'pwa-icon.png'));

// 2) manifest.json
const manifest = {
  name: 'InGreen',
  short_name: 'InGreen',
  description: 'ผู้ช่วยเลือกซื้ออาหารปลอดภัยต่อสุขภาพและรักษ์โลก',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#FAFAFA',
  theme_color: '#2D8048',
  icons: [
    { src: '/pwa-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/pwa-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 3) inject <link>/meta ลงใน index.html
const idxPath = path.join(dist, 'index.html');
let html = fs.readFileSync(idxPath, 'utf8');
const tags =
  '<link rel="manifest" href="/manifest.json" />' +
  '<meta name="theme-color" content="#2D8048" />' +
  '<meta name="apple-mobile-web-app-capable" content="yes" />' +
  '<meta name="apple-mobile-web-app-status-bar-style" content="default" />' +
  '<meta name="apple-mobile-web-app-title" content="InGreen" />' +
  '<link rel="apple-touch-icon" href="/pwa-icon.png" />';
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', tags + '</head>');
  fs.writeFileSync(idxPath, html);
}
console.log('✓ PWA manifest + meta injected into dist/');
