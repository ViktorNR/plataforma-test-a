// Prueba en navegador de: semanas 6–13, práctica SQL con corrección, «Ver respuesta» (bloqueo y 0 %) y bases de ejemplo del Laboratorio.
// Variables: BASE, OUT (capturas, por defecto /shots).
import { chromium } from 'playwright';

const OUT = process.env.OUT ?? '/shots';
const base = process.env.BASE;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 200)));
const out = {};
const ok = (name, cond) => { out[name] = cond ? 'OK' : 'FALLA'; };

await page.goto(base + '/registro');
await page.fill('input[name=nombre]', 'Prueba');
await page.fill('input[name=apellido]', 'Vista');
await page.fill('input[name=email]', `vista${Date.now()}@test.cl`);
await page.fill('input[name=password]', 'clave-segura-1');
await page.selectOption('select[name=cursoId]', { index: 1 });
await Promise.all([page.waitForURL('**/panel'), page.click('button.btn-primary')]);

// Semanas 6 a 13 listan ejercicios
for (let w = 6; w <= 13; w++) {
  await page.goto(`${base}/panel/semana/${w}`);
  await page.waitForSelector('.ex-rows');
  out[`semana${w}`] = await page.locator('.ex-row').count();
}

// Práctica SQL: ejecutar y corregir una consulta correcta
await page.goto(base + '/panel/ejercicio/s8-stock-bajo');
await page.waitForSelector('.sqlwork');
await page.fill('textarea.wb-editor', 'SELECT nombre, stock, precio FROM producto WHERE stock < 20 ORDER BY stock ASC, nombre ASC;');
await page.click('button:has-text("Ejecutar (sin puntaje)")');
await page.waitForSelector('.wb-grid table', { timeout: 30000 });
await page.click('button:has-text("Corregir mi respuesta")');
await page.waitForSelector('#resultado .feedback, #resultado [class*=score], #resultado h3, #resultado h2', { timeout: 40000 });
const txt = await page.locator('#resultado').innerText();
ok('corrige_sql_100', /100\s*%/.test(txt));
await page.screenshot({ path: `${OUT}/30-sqlwork.png`, fullPage: true });

// Ver respuesta: confirma, bloquea y deja 0 %
await page.goto(base + '/panel/ejercicio/s9-citas-estado');
await page.waitForSelector('.sqlwork');
page.once('dialog', (d) => d.accept());
await page.click('button:has-text("Ver respuesta")');
await page.waitForSelector('.locked-note', { timeout: 15000 });
ok('muestra_solucion', (await page.locator('.sol-code').count()) > 0);
ok('sin_boton_corregir', (await page.locator('button:has-text("Corregir mi respuesta")').count()) === 0);
await page.screenshot({ path: `${OUT}/31-ver-respuesta.png`, fullPage: true });
await page.reload();
await page.waitForSelector('.locked-note');
ok('sigue_bloqueado_al_recargar', (await page.locator('.sol-code').count()) > 0 && (await page.locator('textarea.wb-editor').count()) === 0);

// Intento por API tras ver la respuesta debe rechazarse
const r = await page.evaluate(async () => {
  const res = await fetch('/api/intentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 's9-citas-estado', respuesta: { script: 'SELECT 1' } }) });
  return res.status;
});
ok('api_rechaza_intento', r === 403);

// Ver respuesta en un cuestionario y en un modelo E/R
for (const [slug, sel] of [['s8-q-joins', '.opt.correct'], ['s2-veterinaria', '.react-flow']]) {
  await page.goto(`${base}/panel/ejercicio/${slug}`);
  await page.waitForSelector('button:has-text("Ver respuesta")');
  page.once('dialog', (d) => d.accept());
  await page.click('button:has-text("Ver respuesta")');
  await page.waitForSelector(sel, { timeout: 20000 });
  ok(`solucion_${slug}`, true);
  await page.screenshot({ path: `${OUT}/32-sol-${slug}.png` });
}

// El ejercicio visto aparece con 0 % en la semana
await page.goto(base + '/panel/semana/9');
await page.waitForSelector('.ex-rows');
await page.screenshot({ path: `${OUT}/33-semana9.png`, fullPage: true });

// Laboratorio: cargar base de ejemplo
await page.goto(base + '/panel/laboratorio');
await page.waitForSelector('.wb-editor');
if (!(await page.locator('.wb-tplrow button').first().isVisible())) await page.click('summary:has-text("Bases de ejemplo")');
await page.locator('.wb-tplrow button').first().click();
await page.waitForTimeout(6000);
ok('lab_base_cargada', (await page.locator('.wb-tree .wb-node, .wb-name').count()) > 3);
await page.screenshot({ path: `${OUT}/34-lab-plantillas.png`, fullPage: true });

console.log(JSON.stringify(out, null, 1));
console.log('ERRORES DE CONSOLA:', errors.length ? errors : 'ninguno');
await browser.close();
