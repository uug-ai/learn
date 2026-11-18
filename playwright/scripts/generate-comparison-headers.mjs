import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const images = path.join(root, 'app/assets/images');
const claude = await readFile(path.join(images, 'tutorial-claude-uug.svg'), 'utf8');
const uug = claude.match(/<g id="uug-wordmark"[\s\S]*?<\/g>/)?.[0];
if (!uug) throw new Error('The Claude tutorial banner must contain the outlined UUG wordmark.');

const comparisons = [
  { slug: 'arcules', name: 'Milestone Arcules', label: 'Arcules', logo: 'milestone-logo.svg' },
  { slug: 'avigilon-alta', name: 'Avigilon Alta', label: 'Alta', logo: 'avigilon-logo.svg' },
];

for (const comparison of comparisons) {
  const logo = (await readFile(path.join(images, comparison.logo), 'utf8'))
    .replace('<svg', '<svg color="#fff"');
  const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <title>${comparison.name} versus UUG Augment Vision</title>
  <rect width="1200" height="675" fill="#000"/>
  <image x="175" y="267" width="350" height="63" href="data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}"/>
  <text x="350" y="408" fill="#fff" font-family="Arial, sans-serif" font-size="60" text-anchor="middle" letter-spacing="-1">${comparison.label}</text>
  <path d="M650 267v38m0 65v38" stroke="#333" stroke-width="2"/>
  <text x="650" y="348" fill="#a3a3a3" font-family="Arial, sans-serif" font-size="28" text-anchor="middle">vs</text>
  <g transform="translate(-144 -83) scale(1.25)">
    ${uug}
  </g>
</svg>
`;

  const bundle = path.join(root, `app/content/blog/${comparison.slug}-vs-augment-vision`);
  const header = path.join(bundle, 'header-art.svg');
  await writeFile(`${header}.tmp`, artwork);
  await rename(`${header}.tmp`, header);
  const social = path.join(bundle, 'social.png');
  const preview = await sharp(Buffer.from(artwork)).resize(1200, 630, { fit: 'cover' }).png().toBuffer();
  await writeFile(`${social}.tmp`, preview);
  await rename(`${social}.tmp`, social);
  console.log(`Generated the ${comparison.name}/UUG banner and 1200x630 social preview.`);
}
