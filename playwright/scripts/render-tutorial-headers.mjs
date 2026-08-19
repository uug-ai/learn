import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const contentDirectory = path.resolve(scriptDirectory, '../../app/content/tutorials');

const tutorials = [
  { id: 'agent-install', kind: 'install', output: 'agent/install/tutorial-header.png' },
  { id: 'custom-workflow-stage', kind: 'workflow', output: 'hub/custom-workflow-stage/tutorial-header.png' },
  { id: 'deploy-moq-relay-kubernetes', kind: 'relay', output: 'hub/deploy-moq-relay-kubernetes/tutorial-header.png' },
  { id: 'moq-vs-hls-vs-webrtc', kind: 'compare', output: 'hub/moq-vs-hls-vs-webrtc/tutorial-header.png' },
  { id: 'setup-hls-live-view', kind: 'hls', output: 'hub/setup-hls-live-view/tutorial-header.png' },
  { id: 'setup-webrtc-turn', kind: 'webrtc', output: 'hub/setup-webrtc-turn/tutorial-header.png' },
];

const requestedId = process.argv[2];
const selectedTutorials = requestedId
  ? tutorials.filter((tutorial) => tutorial.id === requestedId)
  : tutorials;

if (selectedTutorials.length === 0) {
  throw new Error(`Unknown tutorial header: ${requestedId}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 560 } });

for (const tutorial of selectedTutorials) {
  await page.setContent('<canvas width="1600" height="560"></canvas>');
  await page.evaluate((kind) => {
    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('2d');
    const colors = {
      background: '#090b13',
      panel: '#111521',
      panelStrong: '#171c2b',
      line: '#343b50',
      white: '#f5f7ff',
      muted: '#747d99',
      pink: '#ff315f',
      blue: '#6477ff',
      cyan: '#46dfc1',
      yellow: '#ffc857',
    };

    const line = (x1, y1, x2, y2, color = colors.line, width = 2, dash = []) => {
      context.beginPath();
      context.setLineDash(dash);
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.stroke();
      context.setLineDash([]);
    };

    const path = (points, color, width = 3, dash = []) => {
      context.beginPath();
      context.setLineDash(dash);
      points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
      context.strokeStyle = color;
      context.lineWidth = width;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();
      context.setLineDash([]);
    };

    const panel = (x, y, width, height, accent = colors.line) => {
      context.fillStyle = colors.panel;
      context.fillRect(x, y, width, height);
      context.strokeStyle = accent;
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    };

    const node = (x, y, radius, color, filled = true) => {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = filled ? color : colors.background;
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
    };

    const diamond = (x, y, size, color, filled = true) => {
      context.save();
      context.translate(x, y);
      context.rotate(Math.PI / 4);
      context.fillStyle = filled ? color : colors.background;
      context.fillRect(-size / 2, -size / 2, size, size);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(-size / 2, -size / 2, size, size);
      context.restore();
    };

    const arc = (x, y, radius, start, end, color, width = 3) => {
      context.beginPath();
      context.arc(x, y, radius, start, end);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.lineCap = 'round';
      context.stroke();
    };

    const label = (text, x, y, color = colors.muted, align = 'left') => {
      context.fillStyle = color;
      context.font = '500 12px monospace';
      context.textAlign = align;
      context.fillText(text, x, y);
    };

    const background = () => {
      context.fillStyle = colors.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = '#171b28';
      context.lineWidth = 1;
      for (let x = 32.5; x < canvas.width; x += 48) line(x, 0, x, canvas.height, '#171b28', 1);
      for (let y = 16.5; y < canvas.height; y += 48) line(0, y, canvas.width, y, '#171b28', 1);
      context.fillStyle = '#202638';
      for (let x = 32; x < canvas.width; x += 96) {
        for (let y = 16; y < canvas.height; y += 96) context.fillRect(x - 1, y - 1, 3, 3);
      }
    };

    const drawInstall = () => {
      panel(130, 174, 260, 212, colors.pink);
      context.strokeStyle = colors.pink;
      context.lineWidth = 3;
      context.strokeRect(184, 224, 112, 74);
      context.beginPath();
      context.moveTo(316, 242);
      context.lineTo(356, 261);
      context.lineTo(316, 280);
      context.closePath();
      context.stroke();
      label('CAPTURE', 184, 334, colors.pink);

      panel(620, 110, 360, 340, colors.blue);
      diamond(800, 280, 166, colors.blue, false);
      diamond(800, 280, 86, colors.cyan, false);
      node(800, 280, 8, colors.white);
      label('EDGE PROCESS', 800, 418, colors.blue, 'center');

      panel(1210, 160, 260, 240, colors.cyan);
      [0, 1, 2].forEach((index) => {
        const y = 210 + index * 68;
        context.fillStyle = colors.panelStrong;
        context.fillRect(1254, y, 172, 44);
        context.strokeStyle = colors.cyan;
        context.strokeRect(1254.5, y + 0.5, 171, 43);
      });
      label('DEPLOY', 1254, 374, colors.cyan);

      line(390, 280, 620, 280, colors.pink, 5);
      line(980, 280, 1210, 280, colors.cyan, 5);
      [470, 550, 1050, 1130].forEach((x) => diamond(x, 280, 9, colors.white));
    };

    const drawWorkflow = () => {
      const columns = [180, 510, 850, 1190, 1450];
      line(columns[0], 280, columns[4], 280, colors.line, 2);
      panel(115, 220, 130, 120, colors.pink);
      diamond(180, 280, 38, colors.pink);
      panel(445, 220, 130, 120, colors.blue);
      node(510, 280, 21, colors.blue, false);
      panel(775, 150, 150, 110, colors.cyan);
      panel(775, 300, 150, 110, colors.yellow);
      diamond(850, 205, 30, colors.cyan);
      diamond(850, 355, 30, colors.yellow, false);
      panel(1125, 220, 130, 120, colors.blue);
      node(1190, 280, 21, colors.blue);
      panel(1385, 220, 130, 120, colors.pink);
      diamond(1450, 280, 38, colors.pink, false);
      path([[245, 280], [445, 280]], colors.pink, 5);
      path([[575, 280], [680, 280], [680, 205], [775, 205]], colors.cyan, 5);
      path([[575, 280], [680, 280], [680, 355], [775, 355]], colors.yellow, 3, [10, 10]);
      path([[925, 205], [1020, 205], [1020, 280], [1125, 280]], colors.cyan, 5);
      path([[925, 355], [1020, 355], [1020, 280]], colors.yellow, 3, [10, 10]);
      path([[1255, 280], [1385, 280]], colors.pink, 5);
      label('INPUT', 180, 378, colors.pink, 'center');
      label('DISPATCH', 510, 378, colors.blue, 'center');
      label('ENRICH', 850, 112, colors.cyan, 'center');
      label('PERSIST', 1190, 378, colors.blue, 'center');
      label('RESULT', 1450, 378, colors.pink, 'center');
    };

    const drawRelay = () => {
      panel(105, 150, 330, 260, colors.pink);
      panel(1165, 150, 330, 260, colors.cyan);
      [0, 1, 2].forEach((index) => node(180 + index * 90, 280, 16, colors.pink, index === 1));
      [0, 1, 2].forEach((index) => node(1235 + index * 90, 280, 16, colors.cyan, index === 1));
      [70, 110, 150].forEach((radius, index) => arc(800, 280, radius, 0, Math.PI * 2, [colors.white, colors.blue, colors.cyan][index], index === 0 ? 5 : 2));
      diamond(800, 280, 62, colors.white, false);
      path([[435, 280], [540, 280], [650, 225]], colors.pink, 5);
      path([[950, 225], [1060, 280], [1165, 280]], colors.cyan, 5);
      path([[435, 330], [565, 390], [690, 350]], colors.blue, 2, [9, 10]);
      path([[910, 350], [1035, 390], [1165, 330]], colors.blue, 2, [9, 10]);
      label('PUBLISH', 270, 380, colors.pink, 'center');
      label('QUIC RELAY', 800, 488, colors.blue, 'center');
      label('SUBSCRIBE', 1330, 380, colors.cyan, 'center');
    };

    const drawCompare = () => {
      const lanes = [150, 280, 410];
      const laneColors = [colors.cyan, colors.yellow, colors.pink];
      lanes.forEach((y, laneIndex) => {
        panel(115, y - 52, 1370, 104, laneColors[laneIndex]);
        node(185, y, 15, laneColors[laneIndex]);
        node(1415, y, 15, laneColors[laneIndex], false);
      });
      path([[200, 150], [420, 150], [520, 125], [680, 175], [820, 125], [970, 175], [1180, 150], [1400, 150]], colors.cyan, 6);
      for (let x = 240; x < 1370; x += 100) {
        context.fillStyle = colors.yellow;
        context.fillRect(x, 264, 68, 32);
      }
      path([[200, 410], [460, 410], [580, 340], [800, 340], [1020, 480], [1180, 410], [1400, 410]], colors.pink, 5);
      node(800, 340, 15, colors.white);
      label('01 / RELAY', 150, 122, colors.cyan);
      label('02 / SEGMENTS', 150, 252, colors.yellow);
      label('03 / PEER', 150, 382, colors.pink);
    };

    const drawHls = () => {
      panel(105, 155, 260, 250, colors.pink);
      arc(235, 280, 55, 0, Math.PI * 2, colors.pink, 3);
      context.beginPath();
      context.moveTo(222, 246);
      context.lineTo(222, 314);
      context.lineTo(276, 280);
      context.closePath();
      context.fillStyle = colors.pink;
      context.fill();
      label('ENCODE', 235, 372, colors.pink, 'center');

      const segmentWidths = [66, 112, 80, 142, 72, 106];
      let x = 440;
      segmentWidths.forEach((width, index) => {
        context.fillStyle = index % 2 === 0 ? colors.yellow : colors.blue;
        context.fillRect(x, 258, width, 44);
        context.fillStyle = colors.background;
        context.fillRect(x + 9, 270, Math.max(12, width - 18), 4);
        x += width + 18;
      });
      line(365, 280, 430, 280, colors.pink, 5);
      line(1100, 280, 1200, 280, colors.cyan, 5);
      label('CMAF PARTS', 765, 342, colors.yellow, 'center');

      panel(1200, 145, 290, 270, colors.cyan);
      context.strokeStyle = colors.cyan;
      context.lineWidth = 2;
      context.strokeRect(1240, 190, 210, 132);
      path([[1260, 292], [1300, 260], [1332, 278], [1378, 224], [1430, 244]], colors.cyan, 4);
      context.fillStyle = colors.cyan;
      context.fillRect(1240, 344, 162, 5);
      node(1370, 346, 8, colors.white);
      label('PLAYLIST', 1345, 382, colors.cyan, 'center');
    };

    const drawWebrtc = () => {
      const camera = [210, 300];
      const browser = [1390, 300];
      const turn = [800, 165];
      const broker = [800, 420];
      panel(115, 225, 190, 150, colors.pink);
      panel(1295, 225, 190, 150, colors.cyan);
      [80, 120].forEach((radius) => arc(turn[0], turn[1], radius, Math.PI, Math.PI * 2, colors.blue, 2));
      diamond(turn[0], turn[1], 74, colors.blue, false);
      node(broker[0], broker[1], 42, colors.yellow, false);
      path([camera, [530, 300], [690, 208], turn], colors.pink, 5);
      path([turn, [910, 208], [1070, 300], browser], colors.cyan, 5);
      path([camera, [580, 455], broker], colors.yellow, 2, [9, 10]);
      path([broker, [1020, 455], browser], colors.yellow, 2, [9, 10]);
      path([[305, 280], [800, 280], [1295, 280]], colors.white, 2, [16, 12]);
      node(camera[0], camera[1], 18, colors.pink);
      node(browser[0], browser[1], 18, colors.cyan);
      label('AGENT', 210, 350, colors.pink, 'center');
      label('TURN', 800, 58, colors.blue, 'center');
      label('SIGNAL', 800, 492, colors.yellow, 'center');
      label('BROWSER', 1390, 350, colors.cyan, 'center');
    };

    background();
    ({ install: drawInstall, workflow: drawWorkflow, relay: drawRelay, compare: drawCompare, hls: drawHls, webrtc: drawWebrtc })[kind]();
  }, tutorial.kind);

  const outputPath = path.join(contentDirectory, tutorial.output);
  await page.locator('canvas').screenshot({ path: outputPath, type: 'png' });
  console.log(`Rendered ${outputPath}`);
}

await browser.close();