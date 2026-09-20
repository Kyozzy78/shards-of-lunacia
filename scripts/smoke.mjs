import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ headless: true, executablePath, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const failedRequests = [];
let nativeDialogCount = 0;
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${message.text()} @ ${message.location().url}`); });
page.on('requestfailed', (request) => { if (request.failure()?.errorText === 'net::ERR_ABORTED' && request.url().endsWith('.mp3')) return; failedRequests.push(`${request.url()} :: ${request.failure()?.errorText}`); });
page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`); });
page.on('dialog', async (dialog) => { nativeDialogCount += 1; await dialog.dismiss(); });
await mkdir('artifacts', { recursive: true });

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 60_000 });
await page.getByRole('heading', { name: /SHARDS.*LUNACIA/i }).waitFor();
const mapAssetsButtonCount = await page.getByText(/Map Assets/i).count();
await page.screenshot({ path: 'artifacts/menu-1280x720.png' });
await page.getByRole('button', { name: /Begin Mission/i }).click();
await page.getByRole('heading', { name: 'Choose your approach' }).waitFor();
const mixerCards = await page.locator('.mixer-portrait').count();
await page.getByRole('button', { name: /The Verdant Canopy/i }).click();
const startBox = await page.getByRole('button', { name: /Start Mission/i }).boundingBox();
if (!startBox || startBox.y + startBox.height > 720) throw new Error('Start Mission is not visible at the desktop viewport.');
await page.getByRole('button', { name: /Start Mission/i }).click();
await page.locator('#battle-canvas').waitFor({ state: 'visible', timeout: 60_000 });
await page.getByText('PLAYER PHASE').waitFor({ timeout: 60_000 });
await page.locator('#battle-canvas[data-ready="true"]').waitFor({ timeout: 60_000 });
await page.waitForTimeout(2_000);
const canvasSize = await page.locator('#battle-canvas').boundingBox();
const webgl = await page.locator('#battle-canvas').evaluate((canvas) => Boolean(canvas.getContext('webgl2')));
const axieSources = await page.locator('#battle-canvas').getAttribute('data-axie-sources');
await page.screenshot({ path: 'artifacts/battle-1280x720.png' });
const apBefore = await page.locator('.ap i.full').count();
// Real pointer input, using read-only camera projection rather than a fixed pixel.
const screenCells = JSON.parse(await page.locator('#battle-canvas').getAttribute('data-reachable-screen'));
const clickTarget = screenCells['4,7'];
if (!clickTarget) throw new Error('Expected movement cell 4,7 is not reachable.');
await page.mouse.move(clickTarget.x, clickTarget.y);
await page.screenshot({ path: 'artifacts/path-preview-1280x720.png' });
await page.mouse.click(clickTarget.x, clickTarget.y);
console.log('smoke: movement clicked');
// Commands issued during movement must not spend AP or switch the selected unit.
await page.getByRole('button', { name: /Guard 1 AP/i }).click();
await page.keyboard.press('2');
await page.waitForTimeout(6_000);
console.log('smoke: movement animation waited');
const apAfter = await page.locator('.ap i.full').count();
console.log('smoke: movement state read');
const movementStatus = await page.locator('.target-tip').textContent();
const lastPick = await page.locator('#battle-canvas').getAttribute('data-last-pick');
const lastAppCell = await page.locator('#battle-canvas').getAttribute('data-last-app-cell');
const lastPath = await page.locator('#battle-canvas').getAttribute('data-last-path');
const musicScene = await page.locator('html').getAttribute('data-music-scene');
const audioStatus = await page.locator('html').getAttribute('data-audio-status');
await page.getByRole('button', { name: /Basic Attack/i }).click();
console.log('smoke: attack mode selected');
await page.keyboard.press('Escape');
await page.getByTitle('Help').click();
console.log('smoke: help opened');
await page.getByRole('heading', { name: 'Command your squad' }).waitFor();
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
await page.getByRole('button', { name: /End Turn/i }).click();
console.log('smoke: requested end turn');
await page.getByRole('dialog', { name: 'End player phase?' }).waitFor();
console.log('smoke: in-game end confirmation shown');
await page.getByRole('button', { name: 'Keep Playing' }).click();
await page.getByRole('button', { name: /End Turn/i }).click();
await page.getByRole('button', { name: 'End Turn' }).last().click();
console.log('smoke: end confirmed');
await page.getByText('CHIMERA PHASE', { exact: true }).waitFor();
console.log('smoke: chimera phase shown');
await page.getByText('PLAYER PHASE', { exact: true }).waitFor({ timeout: 60_000 });
console.log('smoke: player phase restored');
await page.getByTitle('Settings').click();
await page.locator('[data-setting="music"]').focus();
await page.keyboard.press('Home');
await page.keyboard.press('Escape');
// eslint-disable-next-line no-undef
const savedMusic = await page.evaluate(() => JSON.parse(localStorage.getItem('shards-settings')).music);
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(1_000);
await page.screenshot({ path: 'artifacts/battle-1920x1080.png' });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobile.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 60_000 });
await mobile.getByRole('button', { name: /Begin Mission/i }).click();
const mobileStartBox = await mobile.getByRole('button', { name: /Start Mission/i }).boundingBox();
if (!mobileStartBox || mobileStartBox.y < 0 || mobileStartBox.y + mobileStartBox.height > 844) throw new Error('Start Mission is not visible at the mobile viewport.');
await mobile.screenshot({ path: 'artifacts/squad-mobile-390x844.png' });

console.log(JSON.stringify({
  menu: true,
  squad: true,
  battle: true,
  webgl2: webgl,
  canvasSize,
  axieSources,
  mixerCards,
  mapAssetsButtonCount,
  nativeDialogCount,
  musicScene,
  audioStatus,
  savedMusic,
  movementAp: `${apBefore}→${apAfter}`,
  clickTarget,
  movementStatus,
  lastPick,
  lastAppCell,
  lastPath,
  consoleErrors,
  failedRequests,
}, null, 2));

await mobile.close();
await browser.close();
if (!webgl || !canvasSize || !axieSources?.includes('kibo:mixer3d') || !axieSources?.includes('xia:mixer3d') || !axieSources?.includes('bing:mixer3d') || !axieSources?.includes('riptide:mixer3d') || !axieSources?.includes('moss:mixer3d') || mixerCards !== 5 || mapAssetsButtonCount !== 0 || nativeDialogCount !== 0 || apBefore !== 3 || apAfter !== 2 || musicScene !== 'battle' || audioStatus || savedMusic !== 0 || consoleErrors.length || failedRequests.length) process.exitCode = 1;
