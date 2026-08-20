import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const tutorialsDirectory = path.resolve(scriptDirectory, '../../app/content/tutorials/hub');

const headers = [
  { slug: 'custom-workflow-stage', motif: 'workflow' },
  { slug: 'moq-vs-hls-vs-webrtc', motif: 'comparison' },
  { slug: 'deploy-moq-relay-kubernetes', motif: 'relay' },
  { slug: 'setup-webrtc-turn', motif: 'webrtc' },
  { slug: 'setup-hls-live-view', motif: 'hls' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 360 } });

for (const header of headers) {
  const tutorialDirectory = path.join(tutorialsDirectory, header.slug);

  await page.setContent('<canvas width="1200" height="360"></canvas>');
  await page.locator('canvas').evaluate(async (canvas, options) => {
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const colors = {
      cyan: '#43e7ef',
      coral: '#ff786d',
      lime: '#b8f36b',
      ink: '#06131b',
      white: '#e8fbff',
    };

    const backdrop = context.createLinearGradient(0, 0, width, height);
    backdrop.addColorStop(0, '#05090e');
    backdrop.addColorStop(0.5, '#0a1821');
    backdrop.addColorStop(1, '#05080c');
    context.fillStyle = backdrop;
    context.fillRect(0, 0, width, height);

    const bloom = context.createRadialGradient(width * 0.52, height * 0.48, 0, width * 0.52, height * 0.48, width * 0.42);
    bloom.addColorStop(0, 'rgba(42, 126, 151, 0.2)');
    bloom.addColorStop(0.45, 'rgba(19, 70, 88, 0.1)');
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = bloom;
    context.fillRect(0, 0, width, height);

    if (options.motif !== 'hls') {
      context.save();
      for (let x = 0.5; x < width; x += 48) {
        context.strokeStyle = x % 192 === 0.5 ? 'rgba(168, 196, 207, 0.34)' : 'rgba(140, 172, 185, 0.22)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0.5; y < height; y += 48) {
        context.strokeStyle = y % 192 === 0.5 ? 'rgba(168, 196, 207, 0.34)' : 'rgba(140, 172, 185, 0.22)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.restore();
    }

    function roundedPath(x, y, shapeWidth, shapeHeight, radius = 12) {
      context.beginPath();
      context.roundRect(x, y, shapeWidth, shapeHeight, radius);
    }

    function strokeGlow(color, lineWidth, drawPath, dash = []) {
      context.save();
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.setLineDash(dash);
      context.shadowColor = color;
      context.shadowBlur = 8;
      drawPath();
      context.stroke();
      context.restore();
    }

    function drawCamera(x, y, size = 1) {
      context.save();
      context.translate(x, y);
      context.scale(size, size);
      context.shadowColor = colors.cyan;
      context.shadowBlur = 12;
      context.fillStyle = 'rgba(5, 20, 29, 0.92)';
      roundedPath(0, 0, 156, 112, 18);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(232, 251, 255, 0.72)';
      context.lineWidth = 2;
      context.stroke();

      context.fillStyle = 'rgba(29, 157, 179, 0.16)';
      context.beginPath();
      context.arc(78, 56, 36, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = colors.cyan;
      context.lineWidth = 3;
      context.stroke();

      context.fillStyle = colors.cyan;
      context.beginPath();
      context.arc(78, 56, 13, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = colors.coral;
      context.beginPath();
      context.arc(132, 22, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function drawBrowser(x, y, browserWidth = 284, browserHeight = 218) {
      context.save();
      context.shadowColor = colors.cyan;
      context.shadowBlur = 10;
      context.fillStyle = 'rgba(5, 20, 29, 0.76)';
      roundedPath(x, y, browserWidth, browserHeight, 16);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(232, 251, 255, 0.74)';
      context.lineWidth = 2;
      context.stroke();

      context.fillStyle = 'rgba(232, 251, 255, 0.12)';
      roundedPath(x + 1, y + 1, browserWidth - 2, 34, 15);
      context.fill();
      [colors.coral, colors.lime, colors.cyan].forEach((color, index) => {
        context.fillStyle = color;
        context.beginPath();
        context.arc(x + 19 + index * 16, y + 17, 4, 0, Math.PI * 2);
        context.fill();
      });

      const screenGradient = context.createLinearGradient(x, y + 36, x + browserWidth, y + browserHeight);
      screenGradient.addColorStop(0, 'rgba(19, 74, 91, 0.88)');
      screenGradient.addColorStop(1, 'rgba(4, 26, 35, 0.96)');
      context.fillStyle = screenGradient;
      roundedPath(x + 15, y + 49, browserWidth - 30, browserHeight - 66, 10);
      context.fill();

      context.fillStyle = 'rgba(232, 251, 255, 0.9)';
      context.beginPath();
      context.moveTo(x + browserWidth / 2 - 13, y + browserHeight / 2 - 18);
      context.lineTo(x + browserWidth / 2 + 20, y + browserHeight / 2);
      context.lineTo(x + browserWidth / 2 - 13, y + browserHeight / 2 + 18);
      context.closePath();
      context.fill();

      context.fillStyle = 'rgba(184, 243, 107, 0.78)';
      roundedPath(x + 28, y + browserHeight - 37, browserWidth - 78, 5, 3);
      context.fill();
      context.fillStyle = colors.coral;
      context.beginPath();
      context.arc(x + 31, y + browserHeight - 35, 7, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function drawSmallBrowser(x, y, browserWidth = 190, browserHeight = 86) {
      context.save();
      context.fillStyle = 'rgba(5, 20, 29, 0.76)';
      roundedPath(x, y, browserWidth, browserHeight, 12);
      context.fill();
      context.strokeStyle = 'rgba(232, 251, 255, 0.6)';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = colors.coral;
      context.beginPath();
      context.arc(x + 16, y + 15, 4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(67, 231, 239, 0.26)';
      roundedPath(x + 12, y + 29, browserWidth - 24, browserHeight - 41, 6);
      context.fill();
      context.restore();
    }

    function drawRelay(x, y, radius = 48) {
      context.save();
      context.translate(x, y);
      context.shadowColor = colors.lime;
      context.shadowBlur = 10;
      context.fillStyle = 'rgba(184, 243, 107, 0.2)';
      context.strokeStyle = colors.lime;
      context.lineWidth = 4;
      context.beginPath();
      for (let index = 0; index < 6; index += 1) {
        const angle = -Math.PI / 2 + index * Math.PI / 3;
        const pointX = Math.cos(angle) * radius;
        const pointY = Math.sin(angle) * radius;
        if (index === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = colors.white;
      context.beginPath();
      context.arc(0, 0, 10, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    if (options.motif !== 'hls') {
      drawCamera(58, 135, 1.05);
    }

    if (options.motif === 'workflow') {
      const nodes = [
        { x: 350, y: 102, color: colors.cyan },
        { x: 510, y: 174, color: colors.coral },
        { x: 668, y: 98, color: colors.lime },
        { x: 668, y: 246, color: colors.cyan },
      ];
      const links = [[235, 180, 350, 126], [390, 126, 510, 198], [550, 198, 668, 122], [550, 198, 668, 270], [708, 122, 845, 144], [708, 270, 845, 224]];
      links.forEach(([fromX, fromY, toX, toY], index) => {
        strokeGlow(index % 3 === 1 ? colors.coral : colors.cyan, 3, () => {
          context.beginPath();
          context.moveTo(fromX, fromY);
          context.bezierCurveTo((fromX + toX) / 2, fromY, (fromX + toX) / 2, toY, toX, toY);
        });
      });
      nodes.forEach((node) => {
        context.fillStyle = 'rgba(5, 20, 29, 0.74)';
        context.strokeStyle = node.color;
        context.lineWidth = 3;
        context.shadowColor = node.color;
        context.shadowBlur = 8;
        roundedPath(node.x, node.y, 42, 48, 10);
        context.fill();
        context.stroke();
        context.shadowBlur = 0;
      });
      drawBrowser(845, 65, 290, 230);
    } else if (options.motif === 'comparison') {
      drawBrowser(845, 65, 290, 230);
      const paths = [
        { y: 128, color: colors.cyan, dash: [] },
        { y: 181, color: colors.lime, dash: [16, 12] },
        { y: 234, color: colors.coral, dash: [3, 10] },
      ];
      paths.forEach((stream, index) => {
        strokeGlow(stream.color, 4, () => {
          context.beginPath();
          context.moveTo(235, 178);
          context.bezierCurveTo(410, 178 + (index - 1) * 75, 650, stream.y, 845, stream.y);
        }, stream.dash);
      });
      drawRelay(590, 235, 31);
    } else if (options.motif === 'relay') {
      drawRelay(565, 180, 68);
      strokeGlow(colors.cyan, 5, () => {
        context.beginPath();
        context.moveTo(235, 180);
        context.lineTo(495, 180);
      });
      [[875, 52], [920, 137], [875, 222]].forEach(([browserX, browserY], index) => {
        strokeGlow(index === 1 ? colors.lime : colors.cyan, 3, () => {
          context.beginPath();
          context.moveTo(633, 180);
          context.bezierCurveTo(735, 180, 770, browserY + 43, browserX, browserY + 43);
        });
        drawSmallBrowser(browserX, browserY, index === 1 ? 215 : 190, 86);
      });
    } else if (options.motif === 'webrtc') {
      drawBrowser(845, 65, 290, 230);
      strokeGlow(colors.cyan, 6, () => {
        context.beginPath();
        context.moveTo(235, 164);
        context.bezierCurveTo(430, 72, 665, 74, 845, 145);
      });
      drawRelay(555, 267, 42);
      strokeGlow(colors.coral, 4, () => {
        context.beginPath();
        context.moveTo(235, 198);
        context.bezierCurveTo(350, 286, 440, 286, 513, 267);
        context.moveTo(597, 267);
        context.bezierCurveTo(700, 286, 770, 245, 845, 220);
      }, [10, 9]);
    } else {
      context.save();
      context.font = '900 220px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.letterSpacing = '18px';
      const letterGradient = context.createLinearGradient(330, 0, 870, 0);
      letterGradient.addColorStop(0, colors.cyan);
      letterGradient.addColorStop(0.52, colors.white);
      letterGradient.addColorStop(1, colors.lime);
      context.fillStyle = letterGradient;
      context.shadowColor = 'rgba(67, 231, 239, 0.3)';
      context.shadowBlur = 18;
      context.fillText('HLS', width / 2, height / 2 - 4);
      context.restore();

      const baseline = context.createLinearGradient(350, 0, 850, 0);
      baseline.addColorStop(0, 'rgba(67, 231, 239, 0)');
      baseline.addColorStop(0.2, 'rgba(67, 231, 239, 0.7)');
      baseline.addColorStop(0.8, 'rgba(184, 243, 107, 0.7)');
      baseline.addColorStop(1, 'rgba(184, 243, 107, 0)');
      context.fillStyle = baseline;
      context.fillRect(350, 294, 500, 2);
    }

    const vignette = context.createRadialGradient(width / 2, height / 2, 120, width / 2, height / 2, 720);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);
  }, { motif: header.motif });

  await page.locator('canvas').screenshot({
    path: path.join(tutorialDirectory, 'header-art.jpg'),
    type: 'jpeg',
    quality: 90,
  });
}

await browser.close();
console.log(`Generated ${headers.length} tutorial headers.`);