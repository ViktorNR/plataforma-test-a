import type { Fd, Feedback, FeedbackItem, NormProblem, StudentNorm } from '../types';

export const closure = (start: Iterable<string>, fds: Fd[]) => {
  const c = new Set(start);
  let changed = true;
  while (changed) {
    changed = false;
    for (const fd of fds) {
      if (fd.lhs.every((a) => c.has(a))) {
        for (const r of fd.rhs) {
          if (!c.has(r)) {
            c.add(r);
            changed = true;
          }
        }
      }
    }
  }
  return c;
};

function subsets<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let mask = 1; mask < 1 << arr.length; mask++) out.push(arr.filter((_, i) => mask & (1 << i)));
  return out.sort((a, b) => a.length - b.length);
}

/** Claves candidatas de una tabla con atributos `attrs` bajo las dependencias `fds`. */
export function candidateKeys(attrs: string[], fds: Fd[]): string[][] {
  const keys: string[][] = [];
  for (const s of subsets(attrs)) {
    if (keys.some((k) => k.every((a) => s.includes(a)))) continue;
    const cl = closure(s, fds);
    if (attrs.every((a) => cl.has(a))) keys.push(s);
  }
  return keys;
}

/** Prueba de reunión sin pérdida (tableau / chase). */
function isLossless(all: string[], tables: string[][], fds: Fd[]) {
  const cell = tables.map((t, r) => Object.fromEntries(all.map((a) => [a, t.includes(a) ? 'a' : `b${r}_${a}`])));
  let changed = true;
  while (changed) {
    changed = false;
    for (const fd of fds) {
      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          if (!fd.lhs.every((a) => cell[i][a] === cell[j][a])) continue;
          for (const r of fd.rhs) {
            const x = cell[i][r];
            const y = cell[j][r];
            if (x === y) continue;
            const keep = x === 'a' ? x : y === 'a' ? y : x < y ? x : y;
            const drop = keep === x ? y : x;
            for (const row of cell) if (row[r] === drop) row[r] = keep;
            changed = true;
          }
        }
      }
    }
  }
  return cell.some((row) => all.every((a) => row[a] === 'a'));
}

/** Preservación de dependencias sin calcular la proyección completa. */
function preserved(fd: Fd, tables: string[][], fds: Fd[]) {
  const z = new Set(fd.lhs);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of tables) {
      const inter = t.filter((a) => z.has(a));
      const cl = closure(inter, fds);
      for (const a of t) {
        if (cl.has(a) && !z.has(a)) {
          z.add(a);
          changed = true;
        }
      }
    }
  }
  return fd.rhs.every((a) => z.has(a));
}

const fmt = (fd: Fd) => `${fd.lhs.join(', ')} → ${fd.rhs.join(', ')}`;

export function gradeNormalization(ans: StudentNorm, problem: NormProblem): Feedback {
  const items: FeedbackItem[] = [];
  const tables = (ans.tables ?? []).filter((t) => t.attrs.length > 0);
  if (!tables.length) {
    return { score: 0, summary: 'No has creado tablas.', items: [{ ok: false, text: 'Crea tablas y arrastra los atributos para descomponer la relación.' }] };
  }
  const valid = new Set(problem.attrs);
  const label = (t: StudentNorm['tables'][number], i: number) => `«${t.name.trim() || `Tabla ${i + 1}`}»`;

  // 1) Cobertura
  const covered = new Set(tables.flatMap((t) => t.attrs.filter((a) => valid.has(a))));
  const missing = problem.attrs.filter((a) => !covered.has(a));
  const coverage = missing.length === 0;
  items.push(coverage ? { ok: true, text: 'Todos los atributos están presentes en alguna tabla.' } : { ok: false, text: `Faltan atributos en tu diseño: ${missing.join(', ')}.` });

  // 2) Claves primarias
  let keysOk = 0;
  tables.forEach((t, i) => {
    const attrs = t.attrs.filter((a) => valid.has(a));
    const pk = t.pk.filter((a) => attrs.includes(a));
    if (!pk.length) {
      items.push({ ok: false, text: `${label(t, i)}: no definiste clave primaria (haz clic en un atributo para marcarlo).` });
      return;
    }
    const cl = closure(pk, problem.fds);
    if (attrs.every((a) => cl.has(a))) {
      keysOk++;
      const minimal = pk.every((a) => !attrs.every((b) => closure(pk.filter((x) => x !== a), problem.fds).has(b)));
      items.push(
        minimal
          ? { ok: true, text: `${label(t, i)}: la clave (${pk.join(', ')}) determina toda la tabla.` }
          : { ok: false, text: `${label(t, i)}: la clave (${pk.join(', ')}) determina la tabla pero no es mínima; sobra algún atributo.` },
      );
      if (!minimal) keysOk -= 0.5;
    } else {
      const notDet = attrs.filter((a) => !cl.has(a));
      items.push({ ok: false, text: `${label(t, i)}: la clave (${pk.join(', ')}) no determina ${notDet.join(', ')}.` });
    }
  });
  const keyFraction = Math.max(0, keysOk) / tables.length;

  // 3) Formas normales
  let nfOk = 0;
  tables.forEach((t, i) => {
    const attrs = t.attrs.filter((a) => valid.has(a));
    const keys = candidateKeys(attrs, problem.fds);
    const prime = new Set(keys.flat());
    const problemsFound: string[] = [];
    const reported: Record<string, string[][]> = {};
    for (const x of subsets(attrs)) {
      const cl = closure(x, problem.fds);
      const isSuper = attrs.every((a) => cl.has(a));
      for (const a of attrs) {
        if (x.includes(a) || !cl.has(a) || prime.has(a)) continue;
        // Solo el determinante mínimo de cada atributo (subsets viene ordenado por tamaño).
        if ((reported[a] ?? []).some((r) => r.every((v) => x.includes(v)))) continue;
        const partial = keys.some((k) => x.every((v) => k.includes(v)) && x.length < k.length);
        const transitive = problem.target === '3NF' && !isSuper;
        if (!partial && !transitive) continue;
        (reported[a] ??= []).push(x);
        problemsFound.push(`${partial ? 'dependencia parcial' : 'dependencia transitiva'}: ${x.join(', ')} → ${a}`);
      }
    }
    // Reporta solo las dependencias de menor determinante, sin repetir.
    const uniq = [...new Set(problemsFound)].slice(0, 3);
    if (!uniq.length) {
      nfOk++;
      items.push({ ok: true, text: `${label(t, i)} cumple ${problem.target}.` });
    } else {
      items.push({ ok: false, text: `${label(t, i)} no cumple ${problem.target}: ${uniq.join('; ')}.` });
    }
  });
  const nfFraction = nfOk / tables.length;

  // 4) Reunión sin pérdida
  const lossless = coverage && isLossless(problem.attrs, tables.map((t) => t.attrs.filter((a) => valid.has(a))), problem.fds);
  items.push(
    lossless
      ? { ok: true, text: 'La descomposición es sin pérdida de información (reunión sin pérdida).' }
      : { ok: false, text: coverage ? 'La descomposición pierde información: al reunir las tablas podrían aparecer filas que no existían.' : 'No se puede verificar la reunión sin pérdida porque faltan atributos.' },
  );

  // 5) Preservación de dependencias
  const tableAttrs = tables.map((t) => t.attrs.filter((a) => valid.has(a)));
  const lost = problem.fds.filter((fd) => !preserved(fd, tableAttrs, problem.fds));
  items.push(
    lost.length === 0
      ? { ok: true, text: 'Se conservan todas las dependencias funcionales.' }
      : { ok: false, text: `Se pierden dependencias funcionales: ${lost.map(fmt).join('; ')}.` },
  );

  // 6) Tablas redundantes
  let redundant = 0;
  tables.forEach((t, i) => {
    tables.forEach((u, j) => {
      if (i !== j && t.attrs.every((a) => u.attrs.includes(a)) && (t.attrs.length < u.attrs.length || i > j)) {
        redundant++;
        items.push({ ok: false, text: `${label(t, i)} está contenida en ${label(u, j)}; es redundante.` });
      }
    });
  });

  const is3 = problem.target === '3NF';
  const w = { cov: 10, key: 15, nf: 35, loss: is3 ? 20 : 25, pres: is3 ? 20 : 15 };
  let score =
    (coverage ? w.cov : 0) +
    w.key * keyFraction +
    w.nf * nfFraction +
    (lossless ? w.loss * Math.max(nfFraction, 0.25) : 0) +
    (lost.length === 0 ? w.pres * Math.max(nfFraction, 0.25) : 0);
  if (tables.length < 2) score = Math.min(score, 25);
  score = Math.max(0, Math.min(100, Math.round(score - redundant * 5)));
  return { score, summary: `Obtuviste ${score}%. Meta: llevar la relación a ${problem.target}.`, items };
}
