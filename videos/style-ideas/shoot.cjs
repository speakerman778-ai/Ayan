const {chromium} = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: 1080, height: 1920}, deviceScaleFactor: 1});
  p.on('pageerror', e => console.log('ERR', e.message));
  for (const f of process.argv.slice(2)) {
    await p.goto('file://' + path.resolve(f));
    await p.waitForFunction('window.READY === 1', null, {timeout: 60000});
    await p.waitForTimeout(400);
    await p.screenshot({path: 'img/' + f.replace('.html', '.png')});
    console.log('ok', f);
  }
  await b.close();
})();
