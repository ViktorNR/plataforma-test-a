import { chromium } from 'playwright';
const base = process.env.BASE;
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
await page.goto(base + '/registro');
await page.fill('input[name=nombre]', 'Lay'); await page.fill('input[name=apellido]', 'Out');
await page.fill('input[name=email]', `lay${Date.now()}@test.cl`); await page.fill('input[name=password]', 'clave-segura-1');
await page.selectOption('select[name=cursoId]', { index: 1 });
await Promise.all([page.waitForURL('**/panel'), page.click('button.btn-primary')]);
for (const slug of ['s2-clinica', 's3-centro-medico']) {
  await page.goto(`${base}/panel/ejercicio/${slug}`);
  await page.waitForSelector('button:has-text("Ver respuesta")');
  page.once('dialog', d => d.accept());
  await page.click('button:has-text("Ver respuesta")');
  await page.waitForSelector('.rf-wrap .react-flow__node'); await page.waitForTimeout(1500);
  await page.locator('.rf-wrap').screenshot({ path: `/shots/60-${slug}.png` });
}
await b.close();