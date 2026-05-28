#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Runs `playwright test <args> --headed`, transparently starting an
 * `Xvfb` virtual X server first when:
 *   - we're on Linux,
 *   - `DISPLAY` is unset, and
 *   - `Xvfb` is on the PATH.
 *
 * Spawning `Xvfb` directly (instead of going through `xvfb-run`) avoids
 * the `xauth` dependency — devcontainers ship `Xvfb` but rarely `xauth`.
 *
 * On macOS / Windows / native Linux workstations that already have a
 * display set, the wrapper is a no-op.
 */

import { spawn, spawnSync } from 'node:child_process';
import * as net from 'node:net';

function hasCommand(cmd) {
  const probe = spawnSync('command', ['-v', cmd], { shell: true });
  return probe.status === 0;
}

// Xvfb listens on TCP port 6000 + <display>. Pick the first free one
// starting from :99 so we don't collide with anything else.
async function pickDisplay() {
  for (let d = 99; d < 200; d++) {
    const port = 6000 + d;
    const free = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.once('error', () => resolve(false));
      srv.once('listening', () => srv.close(() => resolve(true)));
      srv.listen(port, '127.0.0.1');
    });
    if (free) return `:${d}`;
  }
  throw new Error('No free X display in the :99–:199 range.');
}

const playwrightArgs = [
  'playwright',
  'test',
  ...process.argv.slice(2),
  '--headed',
];

async function main() {
  const needsXvfb =
    process.platform === 'linux' && !process.env.DISPLAY && hasCommand('Xvfb');

  let xvfb;
  if (needsXvfb) {
    const display = await pickDisplay();
    console.log(`[run-headed] starting Xvfb on ${display}`);
    xvfb = spawn(
      'Xvfb',
      [display, '-screen', '0', '1450x900x24', '-nolisten', 'tcp'],
      { stdio: 'ignore' },
    );
    xvfb.on('error', (err) => {
      console.error(`[run-headed] Xvfb failed to start: ${err.message}`);
    });
    // Give Xvfb a beat to listen on the unix socket.
    await new Promise((r) => setTimeout(r, 300));
    process.env.DISPLAY = display;
  }

  const child = spawn('npx', playwrightArgs, { stdio: 'inherit' });
  const exitCode = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code ?? 1));
  });

  if (xvfb) {
    try {
      xvfb.kill('SIGTERM');
    } catch {
      /* noop */
    }
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
