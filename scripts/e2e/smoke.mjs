// Prueba de humo en navegador real (Playwright). Ver docs/OPERACION.md.
// Variables: BASE (URL de la app), PW (contraseña del admin), OUT (carpeta de capturas, por defecto /shots).
const OUT = process.env.OUT ?? '/shots';
const shot = (n) => `${OUT}/${n}`;
import { chromium } from 'playwright';

const base = process.env.BASE;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 200)));
const out = {};

await page.goto(base + '/login');
await page.screenshot({ path: shot('20-login.png') });

// Registro de un estudiante nuevo
await page.goto(base + '/registro');
await page.fill('input[name=nombre]', 'Camila');
await page.fill('input[name=apellido]', 'Torres');
await page.fill('input[name=email]', `camila${Date.now()}@test.cl`);
await page.fill('input[name=password]', 'clave-segura-1');
await page.selectOption('select[name=cursoId]', { index: 1 });
await Promise.all([page.waitForURL('**/panel'), page.click('button.btn-primary')]);
await page.waitForSelector('.hero');
await page.screenshot({ path: shot('21-panel.png'), fullPage: true });

await page.goto(base + '/panel/semana/2');
await page.waitForSelector('.ex-rows');
out.semana2_ejercicios = await page.locator('.ex-row').count();
await page.screenshot({ path: shot('22-semana2.png'), fullPage: true });

// Filtro y buscador
await page.fill('input.search', 'farmacia');
out.filtro_farmacia = await page.locator('.ex-row').count();

// Ejercicio E/R con navegación
await page.goto(base + '/panel/ejercicio/s2-veterinaria');
await page.waitForSelector('.react-flow');
await page.screenshot({ path: shot('23-ejercicio.png') });

// Transformación de un modelo grande
await page.goto(base + '/panel/ejercicio/s4-centro-medico');
await page.waitForSelector('.react-flow__node');
await page.waitForTimeout(1000);
await page.screenshot({ path: shot('24-transformacion-grande.png') });
await page.goto(base + '/panel/ejercicio/s4-biblioteca-unab');
await page.waitForSelector('.react-flow__node');
await page.waitForTimeout(800);
await page.screenshot({ path: shot('25-transformacion-biblio.png') });

// Laboratorio MySQL
await page.goto(base + '/panel/laboratorio');
await page.waitForSelector('.wb-editor');
await page.selectOption('select[aria-label=Ejemplos]', 'demo');
await page.click('button:has-text("Ejecutar")');
await page.waitForSelector('.wb-grid table', { timeout: 30000 });
out.demo_filas = await page.locator('.wb-grid tbody tr').count();
await page.waitForTimeout(800);
await page.screenshot({ path: shot('26-laboratorio-demo.png'), fullPage: true });
out.esquemas = await page.locator('.wb-name').count();

await page.selectOption('select[aria-label=Ejemplos]', 'complejas');
await page.click('button:has-text("Ejecutar")');
await page.waitForFunction(() => document.querySelectorAll('.wb-set').length >= 5, null, { timeout: 30000 });
out.complejas_resultados = await page.locator('.wb-set').count();
out.complejas_errores = await page.locator('.wb-set.error').count();

await page.selectOption('select[aria-label=Ejemplos]', 'vista');
await page.click('button:has-text("Ejecutar")');
await page.waitForSelector('.wb-set', { timeout: 30000 });
await page.waitForTimeout(500);
out.vista_errores = await page.locator('.wb-set.error').count();

await page.selectOption('select[aria-label=Ejemplos]', 'procedimiento');
await page.click('button:has-text("Ejecutar")');
await page.waitForFunction(() => document.querySelectorAll('.wb-set').length >= 4, null, { timeout: 30000 });
out.proc_errores = await page.locator('.wb-set.error').count();
out.proc_conjuntos = await page.locator('.wb-set').count();
await page.screenshot({ path: shot('27-laboratorio-proc.png'), fullPage: true });

await page.selectOption('select[aria-label=Ejemplos]', 'funcion');
await page.click('button:has-text("Ejecutar")');
await page.waitForSelector('.wb-set', { timeout: 30000 });
await page.waitForTimeout(500);
out.funcion_resultados = await page.locator('.wb-set').count();
out.funcion_error_texto = await page.locator('.wb-msg.error').allInnerTexts();

// Aislamiento: intentar leer una base ajena y comandos bloqueados
await page.fill('textarea[aria-label="Editor SQL"]', 'SELECT * FROM sbx_u1_algo.tabla;\n');
await page.click('button:has-text("Ejecutar")');
await page.waitForSelector('.wb-msg.error', { timeout: 20000 });
out.ajena = await page.locator('.wb-msg.error').innerText();
await page.fill('textarea[aria-label="Editor SQL"]', "GRANT ALL ON *.* TO 'ws1'@'%';");
await page.click('button:has-text("Ejecutar")');
await page.waitForSelector('.wb-msg.error', { timeout: 20000 });
out.bloqueado = await page.locator('.wb-msg.error').innerText();
await page.fill('textarea[aria-label="Editor SQL"]', 'SHOW DATABASES;');
await page.click('button:has-text("Ejecutar")');
await page.waitForSelector('.wb-grid table', { timeout: 20000 });
out.show_databases = await page.locator('.wb-grid tbody tr td:nth-child(2)').allInnerTexts();

// Lienzo libre
await page.goto(base + '/panel/lienzo');
await page.waitForSelector('.react-flow');
const canvas = await page.locator('.rf-wrap').boundingBox();
async function drag(label, x, y, name) {
  const sb = await page.locator('.pal-item', { hasText: label }).boundingBox();
  await page.mouse.move(sb.x + 20, sb.y + 15);
  await page.mouse.down();
  await page.mouse.move(canvas.x + x, canvas.y + y, { steps: 6 });
  await page.mouse.up();
  if (name) await page.fill('.er-side input', name);
}
out.lienzo_limpio = await page.locator('.react-flow__node').count();
await drag('Entidad', 400, 300, 'Alumno');
await drag('compuesto', 150, 80, 'direccion');
await page.screenshot({ path: shot('28-lienzo.png') });
out.lienzo_nodos = await page.locator('.react-flow__node').count();
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.click('button:has-text("Descargar imagen")')]);
out.png = dl.suggestedFilename();

// Admin
await ctx.clearCookies();
await page.goto(base + '/login');
await page.fill('input[name=email]', 'admin@unab.cl');
await page.fill('input[name=password]', process.env.PW);
await Promise.all([page.waitForURL('**/admin'), page.click('button.btn-primary')]);
await page.screenshot({ path: shot('29-admin.png') });
await page.goto(base + '/admin/estudiantes');
await page.screenshot({ path: shot('30-admin-estudiantes.png') });
out.errors = errors;
console.log(JSON.stringify(out, null, 1));
await browser.close();
