import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(
  scriptDirectory,
  '../../app/content/tutorials/hub/setup-webrtc-turn/header-art.jpg',
);

const artwork = String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="720" viewBox="0 0 2400 720">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#05090f"/>
      <stop offset="0.5" stop-color="#091923"/>
      <stop offset="1" stop-color="#05080e"/>
    </linearGradient>
    <linearGradient id="hub" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#102c4a"/>
      <stop offset="1" stop-color="#081b2a"/>
    </linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#164959"/>
      <stop offset="1" stop-color="#061b24"/>
    </linearGradient>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M96 0H0V96" fill="none" stroke="#9ab6c3" stroke-opacity="0.14" stroke-width="2"/>
    </pattern>
    <filter id="cyan-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#43e7ef" flood-opacity="0.42"/>
    </filter>
    <filter id="blue-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#79a2ff" flood-opacity="0.34"/>
    </filter>
    <filter id="lime-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#b8f36b" flood-opacity="0.36"/>
    </filter>
    <marker id="cyan-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M0 0L10 5 0 10Z" fill="#43e7ef"/>
    </marker>
    <marker id="blue-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M0 0L10 5 0 10Z" fill="#79a2ff"/>
    </marker>
    <marker id="lime-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M0 0L10 5 0 10Z" fill="#b8f36b"/>
    </marker>
  </defs>

  <rect width="2400" height="720" fill="url(#background)"/>
  <rect width="2400" height="720" fill="url(#grid)"/>

  <path d="M820 238C1110 34 1645 34 1940 238" fill="none" stroke="#43e7ef" stroke-width="7" stroke-linecap="round" marker-end="url(#cyan-arrow)" filter="url(#cyan-shadow)"/>
  <text x="1380" y="68" fill="#9eeff4" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="700" letter-spacing="3" text-anchor="middle">DIRECT WEBRTC MEDIA</text>

  <path d="M820 335C892 335 925 300 1000 300" fill="none" stroke="#79a2ff" stroke-width="5" stroke-linecap="round" stroke-dasharray="12 11" marker-end="url(#blue-arrow)"/>
  <path d="M1520 300C1680 300 1790 334 1940 334" fill="none" stroke="#79a2ff" stroke-width="5" stroke-linecap="round" stroke-dasharray="12 11" marker-end="url(#blue-arrow)"/>
  <text x="905" y="291" fill="#a9c2ff" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="700" text-anchor="middle">SDP + ICE</text>

  <path d="M820 455C925 455 984 565 1100 565" fill="none" stroke="#b8f36b" stroke-width="5" stroke-linecap="round" marker-end="url(#lime-arrow)" filter="url(#lime-shadow)"/>
  <path d="M1500 565C1685 565 1800 455 1940 455" fill="none" stroke="#b8f36b" stroke-width="5" stroke-linecap="round" marker-end="url(#lime-arrow)" filter="url(#lime-shadow)"/>
  <text x="1710" y="589" fill="#d9ffad" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="700" letter-spacing="2" text-anchor="middle">RELAY FALLBACK</text>

  <g transform="translate(70 250)">
    <rect width="300" height="220" rx="30" fill="#071e2a" stroke="#8fa7b2" stroke-width="3"/>
    <text x="36" y="48" fill="#9bb0bb" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="700" letter-spacing="3">CAMERA</text>
    <text x="36" y="94" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="29" font-weight="700">IP camera</text>
    <text x="36" y="130" fill="#a8b9c2" font-family="DejaVu Sans, sans-serif" font-size="17">RTSP · H.264</text>
    <circle cx="235" cy="154" r="37" fill="#43e7ef" fill-opacity="0.12" stroke="#43e7ef" stroke-width="5" filter="url(#cyan-shadow)"/>
    <circle cx="235" cy="154" r="13" fill="#43e7ef"/>
    <circle cx="268" cy="36" r="7" fill="#43e7ef"/>
  </g>

  <path d="M370 360H445" fill="none" stroke="#43e7ef" stroke-width="6" marker-end="url(#cyan-arrow)"/>
  <text x="407" y="337" fill="#9eeff4" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" text-anchor="middle">RTSP</text>

  <g transform="translate(445 205)">
    <rect width="375" height="310" rx="32" fill="#071e2a" stroke="#43e7ef" stroke-opacity="0.72" stroke-width="3"/>
    <text x="38" y="51" fill="#9bb0bb" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="700" letter-spacing="3">EDGE</text>
    <text x="38" y="101" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="30" font-weight="700">Kerberos Agent</text>
    <rect x="38" y="139" width="299" height="126" rx="20" fill="#43e7ef" fill-opacity="0.09"/>
    <circle cx="87" cy="202" r="25" fill="#43e7ef" fill-opacity="0.14" stroke="#43e7ef" stroke-width="4"/>
    <path d="M78 187L102 202 78 217Z" fill="#43e7ef"/>
    <text x="132" y="192" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700">WebRTC peer</text>
    <text x="132" y="226" fill="#a8b9c2" font-family="DejaVu Sans, sans-serif" font-size="16">Answer · ICE · media</text>
  </g>

  <g transform="translate(1000 180)" filter="url(#blue-shadow)">
    <rect width="520" height="230" rx="32" fill="url(#hub)" stroke="#79a2ff" stroke-width="3"/>
    <circle cx="46" cy="44" r="16" fill="#326ce5"/>
    <circle cx="46" cy="44" r="5" fill="#dff9ff"/>
    <path d="M46 22V13M46 75V66M24 44H15M77 44H68" stroke="#79a2ff" stroke-width="4" stroke-linecap="round"/>
    <text x="92" y="51" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700">Kerberos Hub</text>
    <text x="36" y="93" fill="#a9c2ff" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="700" letter-spacing="3">SIGNALLING PLANE</text>
    <rect x="36" y="120" width="212" height="76" rx="16" fill="#326ce5" fill-opacity="0.16"/>
    <text x="56" y="151" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700">MQTT broker</text>
    <text x="56" y="178" fill="#a8b9c2" font-family="DejaVu Sans, sans-serif" font-size="15">SDP + ICE</text>
    <rect x="270" y="120" width="214" height="76" rx="16" fill="#326ce5" fill-opacity="0.16"/>
    <text x="290" y="151" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700">Hub API</text>
    <text x="290" y="178" fill="#a8b9c2" font-family="DejaVu Sans, sans-serif" font-size="15">TURN credentials</text>
  </g>

  <g transform="translate(1100 480)" filter="url(#lime-shadow)">
    <rect width="400" height="170" rx="28" fill="#10231f" stroke="#b8f36b" stroke-width="3"/>
    <path d="M48 88L75 42 102 88 75 134Z" fill="#b8f36b" fill-opacity="0.16" stroke="#b8f36b" stroke-width="4"/>
    <circle cx="75" cy="88" r="10" fill="#dff9ff"/>
    <text x="130" y="49" fill="#b9c8c0" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" letter-spacing="3">TURN SERVER</text>
    <text x="130" y="92" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="29" font-weight="700">coturn</text>
    <text x="130" y="126" fill="#d9ffad" font-family="DejaVu Sans, sans-serif" font-size="16">STUN discovery · media relay</text>
  </g>

  <g transform="translate(1940 195)">
    <rect width="380" height="320" rx="32" fill="#071e2a" stroke="#8fa7b2" stroke-width="3"/>
    <path d="M32 0H348A32 32 0 0 1 380 32V67H0V32A32 32 0 0 1 32 0Z" fill="#dff9ff" fill-opacity="0.1"/>
    <circle cx="31" cy="34" r="7" fill="#79a2ff"/>
    <circle cx="57" cy="34" r="7" fill="#b8f36b"/>
    <circle cx="83" cy="34" r="7" fill="#43e7ef"/>
    <text x="31" y="102" fill="#9bb0bb" font-family="DejaVu Sans, sans-serif" font-size="15" font-weight="700" letter-spacing="3">HUB FRONTEND</text>
    <text x="31" y="145" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="28" font-weight="700">Live viewer</text>
    <rect x="31" y="170" width="318" height="116" rx="18" fill="url(#screen)"/>
    <path d="M172 201L221 228 172 255Z" fill="#effcff"/>
    <rect x="58" y="267" width="235" height="7" rx="4" fill="#43e7ef" fill-opacity="0.72"/>
    <circle cx="61" cy="270" r="11" fill="#b8f36b"/>
  </g>

  <rect x="1" y="1" width="2398" height="718" fill="none" stroke="#8ea9b5" stroke-opacity="0.16" stroke-width="2"/>
</svg>`;

await sharp(Buffer.from(artwork))
  .resize(1200, 360)
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(outputPath);

console.log(`Generated ${outputPath}`);