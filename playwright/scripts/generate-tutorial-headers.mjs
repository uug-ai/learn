import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const tutorialsDirectory = path.resolve(scriptDirectory, '../../app/content/tutorials/hub');
const kubernetesLogoUrl = 'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.svg';
const kubernetesLogoResponse = await fetch(kubernetesLogoUrl);
if (!kubernetesLogoResponse.ok) {
  throw new Error(`Unable to download the Kubernetes logo: ${kubernetesLogoResponse.status}`);
}
const kubernetesLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(await kubernetesLogoResponse.text()).toString('base64')}`;

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

    if (!['hls', 'comparison', 'webrtc'].includes(options.motif)) {
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
      const blue = '#6478ff';
      const protocolCenters = [190, 590, 1000];

      context.save();
      protocolCenters.forEach((centerX, index) => {
        const glow = context.createRadialGradient(centerX, 180, 0, centerX, 180, 220);
        glow.addColorStop(0, index === 1 ? 'rgba(184, 243, 107, 0.1)' : 'rgba(67, 231, 239, 0.12)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = glow;
        context.fillRect(centerX - 230, 0, 460, height);
      });
      context.restore();

      // MoQ: three live QUIC paths converging beneath the wordmark.
      [0, 1, 2].forEach((index) => {
        strokeGlow(index === 1 ? blue : colors.cyan, index === 1 ? 3 : 2, () => {
          context.beginPath();
          context.moveTo(72, 277 + index * 10);
          context.bezierCurveTo(120, 245 - index * 6, 230, 245 + index * 8, 306, 276 + index * 6);
        }, index === 2 ? [5, 8] : []);
      });

      // HLS: a segmented timeline with one highlighted playhead.
      [0, 1, 2, 3, 4].forEach((index) => {
        context.fillStyle = index === 2 ? colors.lime : 'rgba(232, 251, 255, 0.24)';
        roundedPath(485 + index * 45, 274, index === 2 ? 34 : 29, 7, 4);
        context.fill();
      });
      context.fillStyle = colors.white;
      context.beginPath();
      context.moveTo(594, 245);
      context.lineTo(610, 254);
      context.lineTo(594, 263);
      context.closePath();
      context.fill();

      // WebRTC: two peers orbit a shared real-time connection.
      context.save();
      context.translate(1000, 279);
      context.strokeStyle = 'rgba(100, 120, 255, 0.72)';
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(0, 0, 112, 23, 0, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = colors.cyan;
      context.shadowColor = colors.cyan;
      context.shadowBlur = 10;
      [-88, 88].forEach((pointX) => {
        context.beginPath();
        context.arc(pointX, 0, 7, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();

      const drawLabel = (text, x, font, fillStyle) => {
        context.save();
        context.font = font;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = fillStyle;
        context.shadowColor = fillStyle;
        context.shadowBlur = 12;
        context.fillText(text, x, 172);
        context.restore();
      };

      drawLabel('MoQ', protocolCenters[0], '750 88px sans-serif', colors.cyan);
      drawLabel('HLS', protocolCenters[1], '750 88px sans-serif', colors.white);
      drawLabel('WebRTC', protocolCenters[2], '750 88px sans-serif', colors.white);

      const drawVersus = (x) => {
        context.save();
        context.translate(x, 177);
        context.font = 'italic 500 27px Georgia, serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = 'rgba(166, 180, 255, 0.9)';
        context.fillText('vs', 0, 1);
        context.restore();
      };

      drawVersus(382);
      drawVersus(790);

      context.save();
      context.font = '600 12px sans-serif';
      context.textAlign = 'center';
      context.fillStyle = 'rgba(232, 251, 255, 0.55)';
      context.fillText('QUIC · PUBLISH / SUBSCRIBE', protocolCenters[0], 82);
      context.fillText('HTTPS · SEGMENTED DELIVERY', protocolCenters[1], 82);
      context.fillText('ICE · REAL-TIME PEERS', protocolCenters[2], 82);
      context.restore();
    } else if (options.motif === 'relay') {
      const kubernetesBlue = '#326ce5';

      context.fillStyle = 'rgba(8, 25, 38, 0.78)';
      context.strokeStyle = 'rgba(80, 132, 235, 0.82)';
      context.lineWidth = 2;
      roundedPath(310, 35, 620, 290, 22);
      context.fill();
      context.stroke();

      const kubernetesLogo = new Image();
      kubernetesLogo.src = options.kubernetesLogoDataUri;
      await kubernetesLogo.decode();
      context.drawImage(kubernetesLogo, 329, 43, 54, 54);

      context.fillStyle = colors.white;
      context.font = '700 13px sans-serif';
      context.fillText('KUBERNETES CLUSTER', 390, 77);

      context.fillStyle = 'rgba(50, 108, 229, 0.16)';
      context.strokeStyle = kubernetesBlue;
      context.lineWidth = 2;
      roundedPath(350, 135, 160, 86, 14);
      context.fill();
      context.stroke();
      context.fillStyle = 'rgba(232, 251, 255, 0.55)';
      context.font = '700 9px sans-serif';
      context.fillText('LOADBALANCER', 372, 164);
      context.fillStyle = colors.white;
      context.font = '700 15px monospace';
      context.fillText('UDP :443', 372, 194);

      const podPositions = [[585, 82], [750, 82], [668, 208]];
      podPositions.forEach(([podX, podY], index) => {
        context.fillStyle = 'rgba(7, 28, 40, 0.94)';
        context.strokeStyle = 'rgba(67, 231, 239, 0.76)';
        context.lineWidth = 2;
        roundedPath(podX, podY, 142, 86, 14);
        context.fill();
        context.stroke();
        context.fillStyle = kubernetesBlue;
        context.beginPath();
        context.arc(podX + 20, podY + 21, 7, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(232, 251, 255, 0.48)';
        context.font = '700 8px sans-serif';
        context.fillText(`POD 0${index + 1}`, podX + 34, podY + 25);
        context.fillStyle = colors.white;
        context.font = '700 13px sans-serif';
        context.fillText('MoQ RELAY', podX + 19, podY + 57);
      });

      strokeGlow(colors.cyan, 5, () => {
        context.beginPath();
        context.moveTo(235, 180);
        context.lineTo(350, 180);
      });
      podPositions.forEach(([podX, podY]) => {
        strokeGlow(colors.cyan, 2, () => {
          context.beginPath();
          context.moveTo(510, 180);
          context.bezierCurveTo(548, 180, podX - 42, podY + 43, podX, podY + 43);
        });
      });
      [[980, 90], [980, 205]].forEach(([browserX, browserY], index) => {
        strokeGlow(index === 0 ? colors.cyan : kubernetesBlue, 3, () => {
          context.beginPath();
          context.moveTo(892, index === 0 ? 125 : 251);
          context.lineTo(browserX, browserY + 43);
        });
        drawSmallBrowser(browserX, browserY, 175, 86);
      });
    } else if (options.motif === 'webrtc') {
      const blue = '#79a2ff';
      const drawArchitectureCard = (x, y, cardWidth, cardHeight, color, eyebrow, title, subtitle) => {
        context.fillStyle = 'rgba(7, 30, 42, 0.94)';
        context.strokeStyle = color;
        context.lineWidth = 2;
        roundedPath(x, y, cardWidth, cardHeight, 15);
        context.fill();
        context.stroke();
        context.fillStyle = 'rgba(232, 251, 255, 0.55)';
        context.font = '700 8px sans-serif';
        context.fillText(eyebrow, x + 18, y + 26);
        context.fillStyle = colors.white;
        context.font = '700 15px sans-serif';
        context.fillText(title, x + 18, y + 52);
        context.fillStyle = 'rgba(232, 251, 255, 0.68)';
        context.font = '500 9px sans-serif';
        context.fillText(subtitle, x + 18, y + 72);
      };

      strokeGlow(colors.cyan, 3, () => {
        context.beginPath();
        context.moveTo(405, 119);
        context.bezierCurveTo(555, 17, 810, 17, 970, 119);
      });
      strokeGlow(blue, 2, () => {
        context.beginPath();
        context.moveTo(405, 170);
        context.lineTo(500, 150);
        context.moveTo(760, 150);
        context.lineTo(970, 170);
      }, [6, 6]);
      strokeGlow(colors.lime, 2, () => {
        context.beginPath();
        context.moveTo(405, 228);
        context.bezierCurveTo(465, 228, 490, 282, 550, 282);
        context.moveTo(760, 282);
        context.bezierCurveTo(850, 282, 895, 228, 970, 228);
      });

      drawArchitectureCard(35, 122, 145, 116, 'rgba(143, 167, 178, 0.9)', 'CAMERA', 'IP camera', 'RTSP · H.264');
      context.fillStyle = colors.cyan;
      context.beginPath();
      context.arc(145, 202, 12, 0, Math.PI * 2);
      context.fill();
      strokeGlow(colors.cyan, 3, () => {
        context.beginPath();
        context.moveTo(180, 180);
        context.lineTo(215, 180);
      });

      drawArchitectureCard(215, 102, 190, 156, colors.cyan, 'EDGE', 'Kerberos Agent', 'WebRTC peer · media');
      drawArchitectureCard(500, 90, 260, 120, blue, 'KERBEROS HUB', 'Signalling plane', 'MQTT · SDP + ICE');
      drawArchitectureCard(550, 240, 210, 86, colors.lime, 'TURN SERVER', 'coturn', 'STUN · relay fallback');
      drawArchitectureCard(970, 98, 195, 160, 'rgba(143, 167, 178, 0.9)', 'HUB FRONTEND', 'Live viewer', 'Video + talk');

      context.fillStyle = 'rgba(232, 251, 255, 0.64)';
      context.font = '700 8px sans-serif';
      context.textAlign = 'center';
      context.fillText('DIRECT WEBRTC MEDIA', 686, 37);
      context.fillText('RELAY FALLBACK', 862, 301);
      context.textAlign = 'start';
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
  }, { motif: header.motif, kubernetesLogoDataUri });

  await page.locator('canvas').screenshot({
    path: path.join(tutorialDirectory, 'header-art.jpg'),
    type: 'jpeg',
    quality: 90,
  });
}

await browser.close();
console.log(`Generated ${headers.length} tutorial headers.`);