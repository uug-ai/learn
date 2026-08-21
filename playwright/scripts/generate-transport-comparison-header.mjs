import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(
  scriptDirectory,
  '../../app/content/tutorials/hub/moq-vs-hls-vs-webrtc/header-art.jpg',
);

const artwork = String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="720" viewBox="0 0 2400 720">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#05090f"/>
      <stop offset="0.5" stop-color="#091923"/>
      <stop offset="1" stop-color="#05080e"/>
    </linearGradient>
    <radialGradient id="moq-glow">
      <stop offset="0" stop-color="#39dff0" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#39dff0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hls-glow">
      <stop offset="0" stop-color="#7691ff" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#7691ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="webrtc-glow">
      <stop offset="0" stop-color="#33bff3" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#33bff3" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M96 0H0V96" fill="none" stroke="#9ab6c3" stroke-opacity="0.14" stroke-width="2"/>
    </pattern>
    <filter id="cyan-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#43e7ef" flood-opacity="0.38"/>
    </filter>
    <filter id="blue-shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="#7187ff" flood-opacity="0.48"/>
    </filter>
  </defs>

  <rect width="2400" height="720" fill="url(#background)"/>
  <rect width="2400" height="720" fill="url(#grid)"/>
  <ellipse cx="380" cy="360" rx="450" ry="360" fill="url(#moq-glow)"/>
  <ellipse cx="1190" cy="360" rx="430" ry="350" fill="url(#hls-glow)"/>
  <ellipse cx="2020" cy="360" rx="460" ry="360" fill="url(#webrtc-glow)"/>

  <g fill="#d9e8ed" fill-opacity="0.58" font-family="DejaVu Sans, sans-serif" font-size="22" font-weight="600" letter-spacing="3" text-anchor="middle">
    <text x="380" y="170">QUIC · PUBLISH / SUBSCRIBE</text>
    <text x="1190" y="170">HTTPS · SEGMENTED DELIVERY</text>
    <text x="2020" y="170">ICE · REAL-TIME PEERS</text>
  </g>

  <g font-family="DejaVu Sans, sans-serif" font-size="164" font-weight="700" text-anchor="middle">
    <text x="380" y="414" fill="#43e7ef" filter="url(#cyan-shadow)">MoQ</text>
    <text x="1190" y="414" fill="#f1f7ff" filter="url(#blue-shadow)" letter-spacing="5">HLS</text>
    <text x="2020" y="414" fill="#dff9ff" filter="url(#cyan-shadow)" letter-spacing="-3">WebRTC</text>
  </g>

  <g fill="#a6b4ff" fill-opacity="0.92" font-family="DejaVu Serif, serif" font-size="48" font-style="italic" font-weight="400" text-anchor="middle">
    <text x="780" y="390">vs</text>
    <text x="1600" y="390">vs</text>
  </g>

  <g fill="none" stroke-linecap="round">
    <path d="M145 565C245 515 410 515 610 568" stroke="#43e7ef" stroke-width="7" filter="url(#cyan-shadow)"/>
    <path d="M145 590C270 550 430 560 610 596" stroke="#7187ff" stroke-width="5" stroke-dasharray="24 18"/>
    <path d="M145 615C295 590 455 605 610 622" stroke="#43e7ef" stroke-opacity="0.56" stroke-width="4" stroke-dasharray="5 15"/>
  </g>

  <g transform="translate(1022 566)">
    <rect width="54" height="13" rx="6" fill="#7187ff" fill-opacity="0.35"/>
    <rect x="72" width="54" height="13" rx="6" fill="#7187ff" fill-opacity="0.55"/>
    <rect x="144" width="70" height="13" rx="6" fill="#43e7ef" filter="url(#cyan-shadow)"/>
    <rect x="232" width="54" height="13" rx="6" fill="#7187ff" fill-opacity="0.55"/>
    <rect x="304" width="54" height="13" rx="6" fill="#7187ff" fill-opacity="0.35"/>
    <path d="M169-55L205-34 169-13Z" fill="#f1f7ff"/>
  </g>

  <g transform="translate(2020 586)" fill="none" stroke="#7187ff">
    <ellipse rx="236" ry="46" stroke-width="4" stroke-opacity="0.8"/>
    <ellipse rx="170" ry="29" stroke-width="3" stroke-opacity="0.35"/>
    <circle cx="-196" r="14" fill="#43e7ef" stroke="none" filter="url(#cyan-shadow)"/>
    <circle cx="196" r="14" fill="#43e7ef" stroke="none" filter="url(#cyan-shadow)"/>
    <path d="M-165 0H165" stroke="#dff9ff" stroke-width="3" stroke-dasharray="10 12"/>
  </g>

  <rect x="1" y="1" width="2398" height="718" fill="none" stroke="#8ea9b5" stroke-opacity="0.16" stroke-width="2"/>
</svg>`;

await sharp(Buffer.from(artwork))
  .resize(1200, 360)
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(outputPath);

console.log(`Generated ${outputPath}`);