import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const [dir, ...rest] = process.argv.slice(2);
const frames = rest.map(Number);
fs.mkdirSync(dir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const composition = await selectComposition({serveUrl, id: 'Dvazhdy', browserExecutable});
for (const f of frames) {
  await renderStill({composition, serveUrl, frame: f, output: `${dir}/f${String(f).padStart(4,'0')}.jpg`, imageFormat: 'jpeg', scale: 0.25, browserExecutable});
}
console.log('done');
