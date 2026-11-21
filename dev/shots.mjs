// Takes the entry's screenshots with headless Chromium: serves game/ with
// the entry's own serve.ts, opens each ?shot= scene from shots.json at
// 1280x720, waits for window.__shotReady, and saves a JPEG that fits the
// gate's 256 KiB cap (lowering quality and retaking when a frame is too
// big). Run from the entry root: node dev/shots.mjs
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '/home/hatch/workspace/makefun/fpsbot/dev/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8097;
const CHROME = '/home/hatch/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome';
const MAX_BYTES = 262144;

const shots = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf8'));

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
    for (const shot of shots) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(`http://localhost:${PORT}/${shot.query}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction('window.__shotReady === true', { timeout: 60000 });
      // Let the staged scene settle for a few frames so toasts and glows read.
      await new Promise((r) => setTimeout(r, 600));
      let quality = 88;
      let buffer = Buffer.alloc(0);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        buffer = await page.screenshot({ type: 'jpeg', quality });
        if (buffer.length <= MAX_BYTES) break;
        quality -= 12;
      }
      const path = join(ROOT, 'screenshots', shot.name);
      writeFileSync(path, buffer);
      const sha = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
      console.log(`${shot.name}: ${buffer.length} bytes, quality ${quality}, sha256 ${sha}…, errors ${errors.length}${errors.length ? ` — ${errors.join(' | ')}` : ''}`);
      if (errors.length > 0) process.exitCode = 1;
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
console.log('shots done');
