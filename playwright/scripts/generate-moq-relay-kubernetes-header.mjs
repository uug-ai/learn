import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(
  scriptDirectory,
  '../../app/content/tutorials/hub/deploy-moq-relay-kubernetes/header-art.jpg',
);

const kubernetesLogoUrl = 'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.svg';
const kubernetesLogoResponse = await fetch(kubernetesLogoUrl);
if (!kubernetesLogoResponse.ok) {
  throw new Error(`Unable to download the Kubernetes logo: ${kubernetesLogoResponse.status}`);
}
const kubernetesLogo = await sharp(Buffer.from(await kubernetesLogoResponse.arrayBuffer()))
  .resize(58, 56, { fit: 'contain' })
  .png()
  .toBuffer();

const pod = (x, y, number) => `
  <g transform="translate(${x} ${y})">
    <rect width="330" height="142" rx="24" fill="#071e2a" stroke="#43e7ef" stroke-opacity="0.72" stroke-width="3"/>
    <circle cx="38" cy="38" r="12" fill="#326ce5"/>
    <path d="M32 38h12M38 32v12" stroke="#dff9ff" stroke-width="3" stroke-linecap="round"/>
    <text x="64" y="47" fill="#9bb0bb" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="700" letter-spacing="3">POD 0${number}</text>
    <text x="38" y="99" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="31" font-weight="700">MoQ relay</text>
    <circle cx="286" cy="91" r="7" fill="#43e7ef"/>
    <circle cx="304" cy="91" r="7" fill="#43e7ef" fill-opacity="0.35"/>
  </g>`;

const artwork = String.raw`
<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="720" viewBox="0 0 2400 720">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#05090f"/>
      <stop offset="0.5" stop-color="#091923"/>
      <stop offset="1" stop-color="#05080e"/>
    </linearGradient>
    <linearGradient id="cluster" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b2940" stop-opacity="0.88"/>
      <stop offset="1" stop-color="#071722" stop-opacity="0.92"/>
    </linearGradient>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M96 0H0V96" fill="none" stroke="#9ab6c3" stroke-opacity="0.14" stroke-width="2"/>
    </pattern>
    <filter id="cyan-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#43e7ef" flood-opacity="0.42"/>
    </filter>
    <filter id="blue-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="11" flood-color="#326ce5" flood-opacity="0.48"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0 0L10 5 0 10Z" fill="#43e7ef"/>
    </marker>
  </defs>

  <rect width="2400" height="720" fill="url(#background)"/>
  <rect width="2400" height="720" fill="url(#grid)"/>

  <g transform="translate(78 230)">
    <rect width="330" height="250" rx="30" fill="#071e2a" stroke="#8fa7b2" stroke-width="3"/>
    <text x="42" y="55" fill="#9bb0bb" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="700" letter-spacing="3">EDGE</text>
    <text x="42" y="108" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="30" font-weight="700">Kerberos Agent</text>
    <circle cx="84" cy="181" r="40" fill="#43e7ef" fill-opacity="0.12" stroke="#43e7ef" stroke-width="5" filter="url(#cyan-shadow)"/>
    <circle cx="84" cy="181" r="14" fill="#43e7ef"/>
    <text x="140" y="188" fill="#c9d9df" font-family="DejaVu Sans, sans-serif" font-size="16">publish over QUIC</text>
  </g>

  <g>
    <rect x="625" y="55" width="1270" height="610" rx="40" fill="url(#cluster)" stroke="#326ce5" stroke-width="4" filter="url(#blue-shadow)"/>
    <text x="815" y="128" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="30" font-weight="700">Kubernetes cluster</text>
    <text x="815" y="165" fill="#9bb0bb" font-family="DejaVu Sans, sans-serif" font-size="17" font-weight="600" letter-spacing="3">MOQ RELAY DEPLOYMENT</text>

    <g transform="translate(700 268)">
      <rect width="350" height="170" rx="25" fill="#326ce5" fill-opacity="0.14" stroke="#79a2ff" stroke-width="3"/>
      <text x="38" y="50" fill="#a8b9c2" font-family="DejaVu Sans, sans-serif" font-size="16" font-weight="700" letter-spacing="3">SERVICE</text>
      <text x="38" y="98" fill="#effcff" font-family="DejaVu Sans, sans-serif" font-size="23" font-weight="700">UDP LoadBalancer</text>
      <text x="38" y="138" fill="#79a2ff" font-family="DejaVu Sans Mono, monospace" font-size="20" font-weight="700">public :443</text>
    </g>

    <g fill="none" stroke="#43e7ef" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)" opacity="0.82">
      <path d="M1050 326C1090 326 1100 261 1150 261"/>
      <path d="M1050 345C1160 178 1400 178 1500 261"/>
      <path d="M1050 380C1140 530 1225 536 1325 536"/>
    </g>

    ${pod(1150, 190, 1)}
    ${pod(1500, 190, 2)}
    ${pod(1325, 465, 3)}
  </g>

  <path d="M408 355H700" fill="none" stroke="#43e7ef" stroke-width="7" stroke-linecap="round" marker-end="url(#arrow)" filter="url(#cyan-shadow)"/>

  <g transform="translate(1995 205)">
    <rect width="325" height="145" rx="24" fill="#071e2a" stroke="#8fa7b2" stroke-width="3"/>
    <circle cx="28" cy="28" r="8" fill="#43e7ef"/>
    <rect x="28" y="54" width="269" height="64" rx="12" fill="#43e7ef" fill-opacity="0.13"/>
    <text x="162" y="94" fill="#dff9ff" font-family="DejaVu Sans, sans-serif" font-size="21" font-weight="700" text-anchor="middle">Hub viewer 01</text>
  </g>
  <g transform="translate(1995 400)">
    <rect width="325" height="145" rx="24" fill="#071e2a" stroke="#8fa7b2" stroke-width="3"/>
    <circle cx="28" cy="28" r="8" fill="#79a2ff"/>
    <rect x="28" y="54" width="269" height="64" rx="12" fill="#326ce5" fill-opacity="0.16"/>
    <text x="162" y="94" fill="#dff9ff" font-family="DejaVu Sans, sans-serif" font-size="21" font-weight="700" text-anchor="middle">Hub viewer 02</text>
  </g>

  <path d="M1895 280H1980" fill="none" stroke="#43e7ef" stroke-width="5" marker-end="url(#arrow)"/>
  <path d="M1895 475H1980" fill="none" stroke="#79a2ff" stroke-width="5" marker-end="url(#arrow)"/>
  <rect x="1" y="1" width="2398" height="718" fill="none" stroke="#8ea9b5" stroke-opacity="0.16" stroke-width="2"/>
</svg>`;

await sharp(Buffer.from(artwork))
  .resize(1200, 360)
  .composite([{ input: kubernetesLogo, left: 337, top: 38 }])
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(outputPath);

console.log(`Generated ${outputPath}`);