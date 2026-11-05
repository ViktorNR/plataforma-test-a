import type { Feedback, FeedbackItem, SchemaSol, StudentSchema } from '../types';
import { finish, key, nameSet } from './text';

type STable = StudentSchema['tables'][number];

function scoreOption(ans: StudentSchema, sol: SchemaSol) {
  const items: FeedbackItem[] = [];
  let earned = 0;
  let max = 0;
  let penalty = 0;

  const sTables = (ans.tables ?? []).filter((t) => t.name.trim());
  const canonOf = new Map<STable, string>(); // tabla del estudiante -> nombre canónico
  const bound = new Map<string, STable>(); // nombre canónico -> tabla del estudiante

  const canonByName = (studentName: string) => {
    const t = sTables.find((x) => key(x.name) === key(studentName));
    return t ? canonOf.get(t) : undefined;
  };

  for (const t of sol.tables) {
    const names = nameSet(t.name, t.aliases);
    const found = sTables.find((s) => !canonOf.has(s) && names.has(key(s.name)));
    if (found) {
      canonOf.set(found, t.name);
      bound.set(t.name, found);
    }
  }
  // Tablas que se reconocen por estructura (p. ej. tablas intermedias con nombre libre).
  for (const t of sol.tables) {
    if (bound.has(t.name) || !t.structural) continue;
    const wanted = new Set(t.cols.filter((c) => c.fk).map((c) => c.fk!));
    const own = t.cols.filter((c) => !c.fk).map((c) => nameSet(c.name, c.aliases));
    const candidates = sTables.filter((s) => {
      if (canonOf.has(s)) return false;
      const targets = new Set(s.cols.filter((c) => c.fkTable).map((c) => canonByName(c.fkTable)));
      return targets.size === wanted.size && [...wanted].every((w) => targets.has(w));
    });
    // Si hay varias candidatas, gana la que tiene más columnas propias reconocibles.
    const score = (s: STable) => own.filter((names) => s.cols.some((c) => names.has(key(c.name)))).length;
    const found = candidates.sort((a, b) => score(b) - score(a))[0];
    if (found) {
      canonOf.set(found, t.name);
      bound.set(t.name, found);
    }
  }

  for (const t of sol.tables) {
    const colPts = t.cols.reduce((n, c) => n + 1 + (c.pk ? 1 : 0) + (c.fk ? 1 : 0), 0);
    max += 2 + colPts;
    const s = bound.get(t.name);
    if (!s) {
      items.push({ ok: false, text: `Falta la tabla «${t.name}»${t.structural ? ' (tabla intermedia o de atributo multivaluado)' : ''}.` });
      continue;
    }
    earned += 2;
    let problems = 0;
    const usedCols = new Set<string>();
    // Primero las columnas por nombre; las claves foráneas que no coinciden por nombre se reconocen por la tabla a la que apuntan.
    const byName = new Map<string, STable['cols'][number]>();
    for (const c of t.cols) {
      const names = nameSet(c.name, c.aliases);
      const hit = s.cols.find((x) => !usedCols.has(x.id) && names.has(key(x.name)));
      if (hit) {
        usedCols.add(hit.id);
        byName.set(c.name + '|' + t.cols.indexOf(c), hit);
      }
    }
    for (const c of t.cols) {
      if (byName.has(c.name + '|' + t.cols.indexOf(c)) || !c.fk) continue;
      const hit = s.cols.find((x) => !usedCols.has(x.id) && x.fkTable && canonByName(x.fkTable) === c.fk);
      if (hit) {
        usedCols.add(hit.id);
        byName.set(c.name + '|' + t.cols.indexOf(c), hit);
      }
    }
    usedCols.clear();
    for (const c of t.cols) {
      const sc = byName.get(c.name + '|' + t.cols.indexOf(c));
      if (sc) usedCols.add(sc.id);
      if (!sc) {
        problems++;
        items.push({ ok: false, text: `En «${s.name}» falta la columna «${c.name}».` });
        continue;
      }
      usedCols.add(sc.id);
      earned += 1;
      if (c.pk) {
        if (sc.pk) earned += 1;
        else {
          problems++;
          items.push({ ok: false, text: `En «${s.name}», «${sc.name}» debe formar parte de la clave primaria.` });
        }
      } else if (sc.pk) {
        problems++;
        penalty += 1;
        items.push({ ok: false, text: `En «${s.name}», «${sc.name}» no debería ser clave primaria.` });
      }
      if (c.fk) {
        if (sc.fkTable && canonByName(sc.fkTable) === c.fk) earned += 1;
        else {
          problems++;
          items.push({ ok: false, text: `En «${s.name}», «${sc.name}» debe ser clave foránea hacia «${c.fk}».` });
        }
      } else if (sc.fkTable) {
        problems++;
        penalty += 1;
        items.push({ ok: false, text: `En «${s.name}», «${sc.name}» no debería ser clave foránea.` });
      }
    }
    for (const x of s.cols) {
      if (x.name.trim() && !usedCols.has(x.id)) {
        penalty += 0.5;
        problems++;
        items.push({ ok: false, text: `La columna «${x.name}» de «${s.name}» no corresponde a esta tabla.` });
      }
    }
    if (!problems) items.push({ ok: true, text: `Tabla «${s.name}» correcta.` });
  }

  for (const s of sTables) {
    if (!canonOf.has(s)) {
      penalty += 2;
      items.push({ ok: false, text: `La tabla «${s.name}» no corresponde al modelo (o está mal nombrada).` });
    }
  }

  return { ...finish(earned, max, penalty, items), raw: earned - penalty };
}

export function gradeSchema(ans: StudentSchema, options: SchemaSol[]): Feedback {
  if (!ans?.tables?.some((t) => t.name.trim())) {
    return { score: 0, summary: 'No has definido tablas.', items: [{ ok: false, text: 'Crea al menos una tabla con sus columnas.' }] };
  }
  const results = options.map((o) => scoreOption(ans, o)).sort((a, b) => b.score - a.score || b.raw - a.raw);
  const { raw: _raw, ...best } = results[0];
  void _raw;
  return best;
}
