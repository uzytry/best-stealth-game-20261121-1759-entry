// Play-tests the game in headless Chromium the way a player would: opens
// the title, starts with Enter, walks the thief, checks the guards patrol,
// forces a detection and a recovery, throws a pebble, and verifies the
// relic/exit flow by driving the game state directly. Fails loudly on any
// page error. Run from the entry root: node dev/playtest.mjs
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '/home/hatch/workspace/makefun/fpsbot/dev/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8098;
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome';

const failures = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in time')), 15000);
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('The Grey Lantern is on')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('exit', () => {
      clearTimeout(timer);
      reject(new Error('server exited before starting'));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
server.stderr.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));

try {
  await waitForServer(server);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-angle=swiftshader', '--mute-audio'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction('window.__game !== undefined', { timeout: 30000 });
    await sleep(500);

    check('title phase on load', await page.evaluate(() => window.__game.phase === 'title'));
    check('level 1 has 3 relics', await page.evaluate(() => window.__game.relics.length === 3));
    check('level 1 has 3 guards', await page.evaluate(() => window.__game.guards.length === 3));
    check('exit exists', await page.evaluate(() => window.__game.exit !== null));

    // Start the game and walk right for a second.
    await page.keyboard.press('Enter');
    await sleep(300);
    check('Enter starts play', await page.evaluate(() => window.__game.phase === 'play'));
    const before = await page.evaluate(() => ({ x: window.__game.player.x, y: window.__game.player.y }));
    await page.keyboard.down('KeyD');
    await sleep(1000);
    await page.keyboard.up('KeyD');
    const after = await page.evaluate(() => ({ x: window.__game.player.x, y: window.__game.player.y }));
    check('player moves with WASD', after.x > before.x + 50, `x ${before.x.toFixed(0)} → ${after.x.toFixed(0)}`);

    // Guards patrol: at least one guard should have moved off its start.
    await sleep(2000);
    const guardMoved = await page.evaluate(() => window.__game.guards.some((g) => g.moving || g.pause < 1.3));
    check('guards patrol', guardMoved);

    // Detection: put the thief 150px ahead of a guard, inside its cone.
    // The guard needs ~3s to fill its meter from there, and ~0.5s to close
    // in once alerted — so wait for the alarm, then teleport away at once.
    await page.evaluate(() => {
      const g = window.__game;
      const guard = g.guards[0];
      // A known open corridor: guard at tile (24,13) facing left, thief
      // 150px ahead at tile (20,13), nothing between them.
      guard.x = 24.5 * 40;
      guard.y = 13.5 * 40;
      guard.state = 'patrol';
      guard.pause = 999;
      guard.facing = Math.PI;
      guard.meter = 0;
      g.player.x = guard.x - 150;
      g.player.y = guard.y;
      g.player.crouched = false;
    });
    await page.waitForFunction(() => window.__game.guards[0].meter > 40, { timeout: 10000 });
    const meter = await page.evaluate(() => window.__game.guards[0].meter);
    check('detection meter fills in a vision cone', meter > 40, `meter ${meter.toFixed(0)}`);
    await page.waitForFunction(() => window.__game.guards[0].state === 'alert', { timeout: 10000 });
    const alertState = await page.evaluate(() => window.__game.guards[0].state);
    check('full meter raises the alarm', alertState === 'alert', `state ${alertState}`);
    await page.evaluate(() => {
      const g = window.__game;
      g.player.x = 60;
      g.player.y = 60;
    });
    await sleep(4000);
    const recovered = await page.evaluate(() => {
      const guard = window.__game.guards[0];
      return guard.state === 'search' || guard.state === 'patrol' || guard.state === 'suspicious';
    });
    check('guard loses the thief and searches / returns', recovered, `state ${await page.evaluate(() => window.__game.guards[0].state)}`);

    // Pebble: click throws one and guards hear it.
    const pebblesBefore = await page.evaluate(() => window.__game.player.pebbles);
    await page.mouse.click(640, 360);
    await sleep(300);
    const pebblesAfter = await page.evaluate(() => window.__game.player.pebbles);
    check('click throws a pebble', pebblesAfter === pebblesBefore - 1, `${pebblesBefore} → ${pebblesAfter}`);

    // Relic pickup: walk the thief onto each relic one at a time, then the exit.
    for (let i = 0; i < 3; i += 1) {
      await page.evaluate((n) => {
        const g = window.__game;
        g.player.x = g.relics[n].x;
        g.player.y = g.relics[n].y;
      }, i);
      await sleep(400);
    }
    const taken = await page.evaluate(() => window.__game.relics.filter((r) => r.taken).length);
    check('relics picked up on touch', taken === 3, `taken ${taken}/3`);
    await page.evaluate(() => {
      const g = window.__game;
      g.player.x = g.exit.x;
      g.player.y = g.exit.y;
    });
    await sleep(800);
    const phase = await page.evaluate(() => window.__game.phase);
    check('exit with all relics clears the hall', phase === 'levelclear', `phase ${phase}`);

    // Next hall loads with 4 guards.
    await page.keyboard.press('Enter');
    await sleep(500);
    const level2 = await page.evaluate(() => ({ index: window.__game.levelIndex, guards: window.__game.guards.length, phase: window.__game.phase }));
    check('level 2 loads', level2.index === 1 && level2.guards === 4 && level2.phase === 'play', JSON.stringify(level2));

    check('no page errors', errors.length === 0, errors.join(' | '));
    await page.close();
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
console.log(failures.length === 0 ? 'playtest: ALL PASS' : `playtest: ${failures.length} FAILURES — ${failures.join(', ')}`);
process.exitCode = failures.length === 0 ? 0 : 1;
