// Prueba de multiusuario: admin crea profesores y cursos, estudiantes se inscriben por NRC y el profesor ve sus indicadores.
// Variables: BASE, PW (clave del admin), ADMIN (correo del admin, por defecto admin@unab.cl), TAG (sufijo único de la corrida).
import { chromium } from 'playwright';
const base = process.env.BASE, pw = process.env.PW, admin = process.env.ADMIN ?? 'admin@unab.cl', tag = process.env.TAG ?? String(Date.now());
const out = { errors: [], checks: [] };
const ok = (name, cond, extra = '') => { out.checks.push(`${cond ? 'OK ' : 'FALLA'} ${name}${extra ? ' · ' + extra : ''}`); if (!cond) out.errors.push(name); };
const b = await chromium.launch();
const ctx = () => b.newContext({ viewport: { width: 1440, height: 1000 } }).then((c) => c.newPage());

async function login(page, email, password) {
  await page.goto(base + '/login');
  await page.fill('input[name=email]', email); await page.fill('input[name=password]', password);
  await page.click('button.btn-primary');
  await page.waitForURL((u) => !u.pathname.includes('login'));
}

// 1. Administrador: profesores y curso
const a = await ctx();
a.on('pageerror', (e) => out.errors.push('pageerror ' + e.message));
await login(a, admin, pw);
for (const n of ['1', '2']) {
  await a.goto(base + '/admin/profesores');
  await a.fill('input[name=nombre]', `Prof${n}`); await a.fill('input[name=apellido]', `Test${tag}`);
  await a.fill('input[name=email]', `prof${n}-${tag}@test.cl`); await a.fill('input[name=password]', 'clave-profe-1');
  await a.click('button.btn-primary');
  await a.waitForSelector('.ok');
}
await a.goto(base + '/admin/cursos');
await a.fill('input[name=nrc]', `T${tag}`);
await a.selectOption('select[name=profesorId]', { label: `Test${tag}, Prof1` });
await a.click('button.btn-primary');
await a.waitForSelector('.ok');
ok('curso creado y vinculado', (await a.locator('tr', { hasText: `T${tag}` }).first().innerText()).includes('Vincular'));
// NRC duplicado debe rechazarse
await a.fill('input[name=nrc]', `T${tag}`); await a.click('button.btn-primary'); await a.waitForSelector('.err');
ok('NRC duplicado rechazado', true);
await a.screenshot({ path: '/shots/mu-admin-cursos.png' });

// 2. Estudiantes se inscriben en el NRC
const ids = [];
for (const n of ['1', '2', '3']) {
  const s = await ctx();
  await s.goto(base + '/registro');
  await s.fill('input[name=nombre]', `Est${n}`); await s.fill('input[name=apellido]', `Test${tag}`);
  await s.fill('input[name=email]', `est${n}-${tag}@test.cl`); await s.fill('input[name=password]', 'clave-segura-1');
  const label = await s.locator('select[name=cursoId] option', { hasText: `NRC T${tag}` }).first().textContent();
  ok('registro muestra el NRC', !!label, label ?? '');
  await s.selectOption('select[name=cursoId]', { label });
  await Promise.all([s.waitForURL('**/panel'), s.click('button.btn-primary')]);
  if (n === '1') {
    // El estudiante 1 resuelve un cuestionario para generar actividad.
    await s.goto(base + '/panel/semana/1'); await s.waitForSelector('.ex-row');
  }
  await s.close();
}

// 3. Profesor 1 ve su curso; profesor 2 no
const p1 = await ctx();
p1.on('pageerror', (e) => out.errors.push('pageerror p1 ' + e.message));
await login(p1, `prof1-${tag}@test.cl`, 'clave-profe-1');
ok('profesor entra a /profesor', p1.url().endsWith('/profesor'));
await p1.waitForSelector('h1');
const lista = await p1.locator('table').first().innerText();
ok('lista de cursos contiene el NRC', lista.includes(`T${tag}`));
await p1.screenshot({ path: '/shots/mu-profesor-home.png' });
await p1.click('table a:has-text("Base de Datos") >> nth=0');
await p1.waitForSelector('.dash-table');
const filas = await p1.locator('.dash-table tbody tr').count();
ok('curso muestra 3 estudiantes', filas === 3, String(filas));
await p1.screenshot({ path: '/shots/mu-profesor-curso.png', fullPage: true });
const cursoUrl = p1.url();
const cursoId = cursoUrl.split('/').pop();
await p1.click('.dash-table tbody tr a >> nth=0');
await p1.waitForSelector('.kpis');
await p1.screenshot({ path: '/shots/mu-profesor-alumno.png', fullPage: true });
// Descarga CSV
for (const tipo of ['alumnos', 'semanas', 'ejercicios', 'matriz']) {
  const r = await p1.evaluate(async (u) => { const x = await fetch(u); return { s: x.status, t: (await x.text()).slice(0, 200), h: x.headers.get('content-disposition') }; }, `/profesor/export?curso=${cursoId}&tipo=${tipo}`);
  ok(`CSV ${tipo}`, r.s === 200 && r.t.includes('Periodo'), r.h ?? '');
}
const total = await p1.evaluate(async () => (await fetch('/profesor/export?tipo=alumnos')).status);
ok('CSV de todos mis cursos', total === 200);

const p2 = await ctx();
await login(p2, `prof2-${tag}@test.cl`, 'clave-profe-1');
const r2 = await p2.goto(`${base}/profesor/curso/${cursoId}`);
ok('profesor ajeno recibe 404 en el curso', r2.status() === 404, String(r2.status()));
const csv2 = await p2.evaluate(async (id) => (await fetch(`/profesor/export?curso=${id}&tipo=alumnos`)).status, cursoId);
ok('profesor ajeno no descarga el CSV', csv2 === 404, String(csv2));
// Un estudiante no entra al panel docente
const e1 = await ctx();
await login(e1, `est1-${tag}@test.cl`, 'clave-segura-1');
await e1.goto(base + '/profesor'); ok('estudiante redirigido fuera de /profesor', e1.url().includes('/panel'));
const csvE = await e1.evaluate(async () => (await fetch('/profesor/export?tipo=alumnos')).status);
ok('estudiante no descarga indicadores', csvE === 403, String(csvE));

// 4. Cerrar el periodo envía el curso al histórico
await a.goto(base + '/admin/periodos');
const fila = a.locator('tr', { hasText: 'Cerrar' }).first();
const nombrePeriodo = (await fila.locator('td').first().innerText()).trim();
await fila.locator('button', { hasText: 'Cerrar' }).click(); await a.waitForTimeout(800);
await p1.goto(base + '/profesor');
ok('curso ya no está en vigentes', !(await p1.locator('body').innerText()).includes(`T${tag}`));
await p1.goto(base + '/profesor?historico=1');
ok('curso aparece en el histórico', (await p1.locator('body').innerText()).includes(`T${tag}`));
await p1.screenshot({ path: '/shots/mu-profesor-historico.png' });
// Al cerrar el periodo: estudiantes y NRC quedan desactivados; el profesor sigue activo y disponible.
const e2 = await ctx();
await e2.goto(base + '/login'); await e2.fill('input[name=email]', `est2-${tag}@test.cl`); await e2.fill('input[name=password]', 'clave-segura-1'); await e2.click('button.btn-primary');
await e2.waitForSelector('.err'); ok('estudiante de periodo cerrado no puede ingresar', (await e2.locator('.err').innerText()).includes('desactivada'));
await a.goto(base + `/admin/estudiantes?cuenta=inactivos&q=Test${tag}`);
ok('estudiantes en la sección Inactivos', (await a.locator('tbody tr').count()) >= 3 && (await a.locator('body').innerText()).includes('Periodo cerrado'));
await a.goto(base + '/admin/profesores');
ok('profesor sigue activo y disponible', (await a.locator('body').innerText()).includes(`Test${tag}`) && (await a.locator('body').innerText()).includes('Disponible para asignar'));
await a.goto(base + '/admin/cursos');
ok('NRC marcado como desactivada', (await a.locator('tr', { hasText: `T${tag}` }).first().innerText()).includes('Desactivada'));
// reabrir
await a.goto(base + '/admin/periodos');
await a.locator('tr', { hasText: nombrePeriodo }).locator('button', { hasText: 'Reabrir' }).click(); await a.waitForTimeout(800);
await p1.goto(base + '/profesor');
ok('periodo reabierto: curso vuelve a vigentes', (await p1.locator('body').innerText()).includes(`T${tag}`));
await e2.fill('input[name=password]', 'clave-segura-1'); await e2.click('button.btn-primary'); await e2.waitForURL('**/panel');
ok('al reabrir el periodo el estudiante vuelve a ingresar', true);
await a.goto(base + '/admin/profesores');
await a.locator('tr', { hasText: `Test${tag}, Prof2` }).locator('summary').click();
await a.locator('tr', { hasText: `Test${tag}, Prof2` }).locator('button', { hasText: 'Desactivar' }).click(); await a.waitForTimeout(800);
await a.goto(base + '/admin/profesores?estado=inactivos');
ok('profesor desactivado aparece en Inactivos', (await a.locator('body').innerText()).includes(`Test${tag}`));
a.once('dialog', (d) => d.accept());
await a.locator('tr', { hasText: `Test${tag}, Prof2` }).locator('summary').click();
await a.locator('tr', { hasText: `Test${tag}, Prof2` }).locator('button', { hasText: 'Eliminar' }).click(); await a.waitForTimeout(1000);
await a.goto(base + '/admin/profesores?estado=inactivos');
ok('profesor eliminado', !(await a.locator('body').innerText()).includes(`Prof2`));

await b.close();
console.log(JSON.stringify(out, null, 1));
