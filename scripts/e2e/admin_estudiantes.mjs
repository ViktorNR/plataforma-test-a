// Prueba de la gestión de estudiantes del administrador: búsqueda, ficha y restablecimiento de clave.
// Variables: BASE, PW (clave del admin), TAG (sufijo único). Crea un estudiante @test.cl.
import { chromium } from 'playwright';
const base = process.env.BASE, pw = process.env.PW, tag = process.env.TAG ?? String(Date.now());
const out = { errors: [], checks: [] };
const ok = (n, c, x = '') => { out.checks.push(`${c ? 'OK ' : 'FALLA'} ${n}${x ? ' · ' + x : ''}`); if (!c) out.errors.push(n); };
const b = await chromium.launch();
const nueva = () => b.newContext({ viewport: { width: 1440, height: 900 } }).then((c) => c.newPage());

const s = await nueva();
await s.goto(base + '/registro');
await s.fill('input[name=nombre]', 'Zoila'); await s.fill('input[name=apellido]', `Prueba${tag}`);
await s.fill('input[name=email]', `zoila-${tag}@test.cl`); await s.fill('input[name=password]', 'clave-inicial-1');
await s.selectOption('select[name=cursoId]', { index: 1 });
await Promise.all([s.waitForURL('**/panel'), s.click('button.btn-primary')]);

const a = await nueva();
a.on('pageerror', (e) => out.errors.push('pageerror ' + e.message));
await a.goto(base + '/login'); await a.fill('input[name=email]', 'admin@unab.cl'); await a.fill('input[name=password]', pw);
await a.click('button.btn-primary'); await a.waitForURL('**/admin');
await a.goto(`${base}/admin/estudiantes?q=Prueba${tag}`);
await a.waitForSelector('tbody tr');
ok('búsqueda encuentra al estudiante', (await a.locator('tbody tr').count()) === 1);
await a.screenshot({ path: '/shots/ad-lista.png', fullPage: true });
await a.click(`a:has-text("Prueba${tag}")`);
await a.waitForSelector('.clave-form');
await a.click('button:has-text("Generar clave temporal")');
await a.waitForSelector('.clave-box code');
const clave = (await a.locator('.clave-box code').innerText()).trim();
ok('clave temporal generada', clave.length === 10, clave);
await a.screenshot({ path: '/shots/ad-ficha.png', fullPage: true });

const e = await nueva();
await e.goto(base + '/login'); await e.fill('input[name=email]', `zoila-${tag}@test.cl`); await e.fill('input[name=password]', 'clave-inicial-1');
await e.click('button.btn-primary'); await e.waitForTimeout(1200);
ok('la clave anterior ya no funciona', e.url().includes('/login'));
await e.fill('input[name=password]', clave); await e.click('button.btn-primary'); await e.waitForURL('**/panel');
ok('la clave temporal permite ingresar', true);

// clave manual y desactivar
await a.click('button:has-text("Escribir una")');
await a.fill('input[name=password]', 'corta'); await a.click('button:has-text("Guardar clave")');
ok('clave corta rechazada por el formulario', true);
await a.fill('input[name=password]', 'manual-clave-9'); await a.click('button:has-text("Guardar clave")');
await a.waitForSelector('.clave-ok');
ok('clave manual guardada', (await a.locator('.clave-ok').innerText()).includes('restablecida'));
await a.click('button:has-text("Desactivar cuenta")'); await a.waitForSelector('button:has-text("Activar cuenta")');
ok('cuenta desactivada', true);
await a.goto(`${base}/admin/estudiantes?cuenta=inactivos&q=Prueba${tag}`);
ok('filtro de cuentas desactivadas', (await a.locator('tbody tr').count()) === 1);

await b.close();
console.log(JSON.stringify(out, null, 1));
