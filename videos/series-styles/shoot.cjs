const {chromium} = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: 1080, height: 1920}});
  p.on('pageerror', e => console.log('ERR', e.message));
  for (const spec of process.argv.slice(2)) {
    const [file, out] = spec.split('|');
    await p.goto('file://' + path.resolve(file.split('?')[0]) + (file.includes('?') ? '?' + file.split('?')[1] : ''));
    await p.waitForFunction('window.READY === 1', null, {timeout: 60000});
    await p.waitForTimeout(300);
    await p.screenshot({path: 'img/' + out + '.png'});
    console.log('ok', out);
  }
  await b.close();
})();
