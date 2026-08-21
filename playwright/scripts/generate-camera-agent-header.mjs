import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(
  scriptDirectory,
  '../../app/content/tutorials/agent/connect-any-camera/header-art.jpg',
);

const artwork = String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="720" viewBox="0 0 2400 720">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#05090f"/>
      <stop offset="0.5" stop-color="#091923"/>
      <stop offset="1" stop-color="#05080e"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="#43e7ef" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#43e7ef" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="agent-panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d2633"/>
      <stop offset="1" stop-color="#07151e"/>
    </linearGradient>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M96 0H0V96" fill="none" stroke="#9ab6c3" stroke-opacity="0.14" stroke-width="2"/>
    </pattern>
    <filter id="cyan-shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#43e7ef" flood-opacity="0.48"/>
    </filter>
    <filter id="lime-shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#b8f36b" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect width="2400" height="720" fill="url(#background)"/>
  <rect width="2400" height="720" fill="url(#grid)"/>
  <ellipse cx="1260" cy="360" rx="1080" ry="520" fill="url(#glow)"/>

  <g transform="translate(74 175)">
    <rect width="520" height="370" rx="36" fill="#071821" stroke="#7d9ba7" stroke-width="4"/>
    <text x="42" y="58" fill="#8eb0bd" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="700" letter-spacing="5">ON YOUR NETWORK</text>
    <text x="42" y="112" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="38" font-weight="700">Any IP camera</text>
    <g transform="translate(42 158)" filter="url(#cyan-shadow)">
      <rect width="228" height="154" rx="28" fill="#0a1d27" stroke="#dff9ff" stroke-opacity="0.72" stroke-width="4"/>
      <circle cx="114" cy="77" r="52" fill="#1d9db3" fill-opacity="0.16" stroke="#43e7ef" stroke-width="7"/>
      <circle cx="114" cy="77" r="21" fill="#43e7ef"/>
      <circle cx="196" cy="30" r="9" fill="#ff786d"/>
    </g>
    <g font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700">
      <rect x="302" y="183" width="162" height="48" rx="12" fill="#43e7ef" fill-opacity="0.12" stroke="#43e7ef" stroke-opacity="0.48" stroke-width="2"/>
      <text x="338" y="215" fill="#dff9ff">H.264</text>
      <rect x="302" y="248" width="162" height="48" rx="12" fill="#43e7ef" fill-opacity="0.08" stroke="#43e7ef" stroke-opacity="0.34" stroke-width="2"/>
      <text x="338" y="280" fill="#dff9ff">H.265</text>
    </g>
  </g>

  <g transform="translate(690 286)">
    <circle cx="80" cy="80" r="77" fill="#0a1f2a" stroke="#43e7ef" stroke-width="5" filter="url(#cyan-shadow)"/>
    <path d="M39 80H121M80 39V121M51 51L109 109M109 51L51 109" stroke="#43e7ef" stroke-width="4" stroke-linecap="round" opacity="0.62"/>
    <circle cx="80" cy="80" r="17" fill="#effcff"/>
    <text x="80" y="184" fill="#a9c4ce" font-family="DejaVu Sans, sans-serif" font-size="21" font-weight="700" letter-spacing="4" text-anchor="middle">LOCAL LAN</text>
  </g>

  <path d="M594 366H690" stroke="#43e7ef" stroke-width="7" stroke-linecap="round" filter="url(#cyan-shadow)"/>
  <path d="M850 366H1002" stroke="#43e7ef" stroke-width="7" stroke-linecap="round" filter="url(#cyan-shadow)"/>
  <path d="M971 347L1002 366 971 385Z" fill="#43e7ef"/>
  <text x="922" y="327" fill="#a9c4ce" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700" letter-spacing="3" text-anchor="middle">RTSP</text>

  <g transform="translate(1002 76)">
    <rect width="1320" height="568" rx="42" fill="url(#agent-panel)" stroke="#b8f36b" stroke-width="5" filter="url(#lime-shadow)"/>
    <circle cx="58" cy="54" r="10" fill="#ff786d"/>
    <circle cx="90" cy="54" r="10" fill="#b8f36b"/>
    <circle cx="122" cy="54" r="10" fill="#43e7ef"/>
    <text x="58" y="118" fill="#8eb0bd" font-family="DejaVu Sans, sans-serif" font-size="21" font-weight="700" letter-spacing="5">SETTINGS / CAMERA</text>
    <text x="58" y="174" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="42" font-weight="700">Kerberos Agent</text>

    <g transform="translate(58 220)">
      <rect width="1204" height="116" rx="22" fill="#071820" stroke="#43e7ef" stroke-opacity="0.42" stroke-width="3"/>
      <text x="28" y="37" fill="#43e7ef" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700" letter-spacing="4">MAIN STREAM · RECORDING</text>
      <text x="28" y="78" fill="#dff9ff" font-family="DejaVu Sans Mono, monospace" font-size="23">rtsp://camera.local/stream1</text>
      <rect x="1010" y="31" width="160" height="54" rx="27" fill="#b8f36b" fill-opacity="0.15" stroke="#b8f36b" stroke-width="2"/>
      <path d="M1036 58L1048 70 1070 44" fill="none" stroke="#b8f36b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="1083" y="66" fill="#dff9ff" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="700">VERIFIED</text>
    </g>

    <g transform="translate(58 356)">
      <rect width="1204" height="116" rx="22" fill="#071820" stroke="#43e7ef" stroke-opacity="0.28" stroke-width="3"/>
      <text x="28" y="37" fill="#43e7ef" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="700" letter-spacing="4">SUB-STREAM · LIVE VIEW</text>
      <text x="28" y="78" fill="#dff9ff" font-family="DejaVu Sans Mono, monospace" font-size="23">rtsp://camera.local/stream2</text>
      <rect x="1010" y="31" width="160" height="54" rx="27" fill="#b8f36b" fill-opacity="0.15" stroke="#b8f36b" stroke-width="2"/>
      <path d="M1036 58L1048 70 1070 44" fill="none" stroke="#b8f36b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="1083" y="66" fill="#dff9ff" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="700">VERIFIED</text>
    </g>

    <rect x="1038" y="495" width="224" height="54" rx="14" fill="#b8f36b"/>
    <text x="1150" y="530" fill="#071820" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="800" letter-spacing="2" text-anchor="middle">SAVE</text>
  </g>

  <rect x="1" y="1" width="2398" height="718" fill="none" stroke="#8ea9b5" stroke-opacity="0.16" stroke-width="2"/>
</svg>`;

await sharp(Buffer.from(artwork))
  .resize(1200, 360)
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(outputPath);

console.log(`Generated ${outputPath}`);