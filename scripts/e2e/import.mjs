import { chromium } from 'playwright';
const base = process.env.BASE;
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1400, height: 950 } })).newPage();
await page.goto(base + '/registro');
await page.fill('input[name=nombre]', 'Imp'); await page.fill('input[name=apellido]', 'Orta');
await page.fill('input[name=email]', `imp${Date.now()}@test.cl`); await page.fill('input[name=password]', 'clave-segura-1');
await page.selectOption('select[name=cursoId]', { index: 1 });
await Promise.all([page.waitForURL('**/panel'), page.click('button.btn-primary')]);
for (const file of ['semana-2/01-s2-biblioteca.json', 'semana-2/15-s2-veterinaria.json', 'semana-3/01-s3-empleados.json', 'semana-3/15-s3-red-climatica.json']) {
  await page.goto(`${base}/panel/lienzo`);
  await page.waitForSelector('.react-flow');
  await page.setInputFiles('input[type=file]', `/data/importar-lienzo/${file}`);
  await page.waitForTimeout(1500);
  console.log(file, 'nodos:', await page.locator('.react-flow__node').count(), 'aristas:', await page.locator('.react-flow__edge').count(), 'error:', await page.locator('text=no es un diagrama válido').count());
  await page.screenshot({ path: `/shots/50-import-${file.split('/')[1]}.png` });
}
await b.close();