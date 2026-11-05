import type { ErAttr, ErEntity, ErModel, ErRel, ErSpec, SchemaCol, SchemaSol, SchemaTable } from '../types';

/**
 * Genera las soluciones relacionales aceptadas para un modelo E/R aplicando las reglas de transformación:
 * entidad → tabla, compuesto → una columna por parte, derivado → no se almacena, multivaluado → tabla aparte,
 * 1:N → FK en el lado N, 1:1 → FK en cualquiera de los lados, N:M → tabla intermedia, entidad débil → PK compuesta,
 * especialización → estrategia 1 (tabla por clase), 3 (tabla única con tipo) o 4 (tabla única con indicadores).
 * La notación de cardinalidad es "look across": en `A:1, B:N`, A es el lado «uno» y B el lado «muchos».
 */
export function autoSchemas(model: ErModel): SchemaSol[] {
  const specs = model.specializations ?? [];
  const oneToOne = model.relationships.filter((r) => r.between.length === 2 && r.between[0].card === '1' && r.between[1].card === '1' && !r.identifying);
  const sides = Math.min(oneToOne.length, 3);
  const strategies: (1 | 3 | 4)[] = specs.length ? (specs.every((s) => s.disjoint) ? [1, 3, 4] : [1, 4]) : [1];

  const out: SchemaSol[] = [];
  for (const strat of strategies) {
    for (let mask = 0; mask < 1 << sides; mask++) out.push(build(model, strat, oneToOne.slice(0, sides), mask));
  }
  return out;
}

type Key = { name: string; aliases: string[] };

function build(model: ErModel, strat: 1 | 3 | 4, oneToOne: ErRel[], mask: number): SchemaSol {
  const ent = new Map<string, ErEntity>(model.entities.map((e) => [e.name, e]));
  const specs = model.specializations ?? [];
  const specOfChild = new Map<string, ErSpec>();
  for (const s of specs) for (const c of s.children) specOfChild.set(c, s);

  const root = (name: string): string => {
    const sp = specOfChild.get(name);
    return sp ? root(sp.parent) : name;
  };
  /** Nombre de la tabla donde vive la entidad. */
  const tableOf = (name: string) => (strat === 1 ? name : root(name));
  const tableAliases = (name: string) => ent.get(name)?.aliases ?? [];

  const ownerOfWeak = (name: string): string | undefined => {
    const r = model.relationships.find((x) => x.identifying && x.between.some((b) => b.entity === name));
    return r?.between.find((b) => b.entity !== name)?.entity;
  };

  /** Columnas de la clave primaria de una entidad (con su alias). */
  const pkOf = (name: string, seen = new Set<string>()): Key[] => {
    if (seen.has(name)) return [];
    seen.add(name);
    const e = ent.get(name);
    if (!e) return [];
    const sp = specOfChild.get(name);
    if (sp && !e.attrs.some((a) => a.key)) return pkOf(sp.parent, seen);
    const own = e.attrs.filter((a) => a.key || a.partialKey).map((a) => ({ name: a.name, aliases: a.aliases ?? [] }));
    if (e.weak) {
      const owner = ownerOfWeak(name);
      return [...(owner ? pkOf(owner, seen) : []), ...own];
    }
    return own;
  };

  /** Atributos que se almacenan en la tabla de la entidad (compuestos expandidos, sin derivados ni multivaluados). */
  const flat = (attrs: ErAttr[]): ErAttr[] =>
    attrs.flatMap((a) => (a.derived || a.multi ? [] : a.parts?.length ? flat(a.parts) : [a]));

  const tables = new Map<string, SchemaTable>();
  const addCol = (t: SchemaTable, c: SchemaCol) => {
    const dup = t.cols.find((x) => x.name === c.name && !!x.fk === !!c.fk);
    if (dup) {
      dup.pk = dup.pk || c.pk;
      return;
    }
    t.cols.push(c);
  };
  const getTable = (name: string): SchemaTable => {
    const tn = tableOf(name);
    let t = tables.get(tn);
    if (!t) {
      t = { name: tn, aliases: tableAliases(tn), cols: [] };
      tables.set(tn, t);
    }
    return t;
  };
  const fkCols = (target: string, pk: boolean, refTableOf = tableOf): SchemaCol[] =>
    pkOf(target).map((k) => ({
      name: k.name,
      aliases: [...k.aliases, `${k.name}_${refTableOf(target)}`, `id_${refTableOf(target)}`, refTableOf(target), `cod_${refTableOf(target)}`],
      pk,
      fk: refTableOf(target),
    }));

  // ---- Entidades ----
  for (const e of model.entities) {
    const t = getTable(e.name);
    const sp = specOfChild.get(e.name);
    if (strat === 1 && sp) {
      for (const c of fkCols(sp.parent, true)) addCol(t, c);
    } else if (!sp || strat === 1) {
      for (const k of pkOf(e.name)) {
        const isOwnerKey = e.weak && !e.attrs.some((a) => (a.key || a.partialKey) && a.name === k.name);
        addCol(t, { name: k.name, aliases: k.aliases, pk: true, ...(isOwnerKey ? { fk: tableOf(ownerOfWeak(e.name)!) } : {}) });
      }
    }
    const keyNames = new Set(pkOf(e.name).map((k) => k.name));
    for (const a of flat(e.attrs)) {
      if ((a.key || a.partialKey) && keyNames.has(a.name)) continue;
      addCol(t, { name: a.name, aliases: a.aliases });
    }
  }

  // Estrategias 3 y 4: columna de tipo / indicadores en la tabla raíz
  if (strat !== 1) {
    for (const s of specs) {
      const t = getTable(s.parent);
      if (strat === 3) {
        if (!t.cols.some((c) => c.name === 'tipo')) t.cols.push({ name: 'tipo', aliases: ['tipo_' + root(s.parent), 'clase', 'categoria', 'tipo_' + s.parent, 'type'] });
      } else {
        for (const c of s.children) t.cols.push({ name: 'es_' + c, aliases: [c, 'is_' + c, 'es' + c, 'es_' + c.toLowerCase()] });
      }
    }
  }

  // ---- Atributos multivaluados ----
  for (const e of model.entities) {
    for (const a of e.attrs.filter((x) => x.multi && !x.derived)) {
      const owner = getTable(e.name).name;
      const t: SchemaTable = {
        name: `${owner}_${a.name}`,
        aliases: [a.name, `${a.name}s`, `${a.name}_${owner}`, `${owner}_${a.name}s`, `${owner}s_${a.name}`],
        structural: true,
        cols: [...fkCols(e.name, true), { name: a.name, aliases: a.aliases, pk: true }],
      };
      tables.set(t.name, t);
    }
  }

  // ---- Relaciones ----
  for (const r of model.relationships) {
    if (r.identifying) continue;
    const relAttrs = flat(r.attrs ?? []);
    const [x, y] = r.between;
    const ends = r.between;
    const isNN = ends.length === 2 && x.card === 'N' && y.card === 'N';

    if (ends.length > 2 || isNN) {
      const names = ends.map((b) => tableOf(b.entity));
      const t: SchemaTable = {
        name: r.name,
        aliases: [names.join('_'), [...names].reverse().join('_'), names.join(''), ...(names.length === 2 ? [`${names[0]}${names[1]}`] : [])],
        structural: true,
        cols: [],
      };
      ends.forEach((b, i) => {
        for (const c of fkCols(b.entity, true)) {
          // Dos extremos sobre la misma entidad (reflexiva N:M): columnas con nombre distinto.
          const repeated = ends.findIndex((o) => o.entity === b.entity) !== i;
          t.cols.push(repeated ? { ...c, name: `${c.name}_${i + 1}`, aliases: [...(c.aliases ?? []), c.name] } : c);
        }
      });
      for (const a of relAttrs) t.cols.push({ name: a.name, aliases: a.aliases });
      for (const a of (r.attrs ?? []).filter((q) => q.multi)) t.cols.push({ name: a.name, aliases: a.aliases, pk: true });
      tables.set(`rel:${r.name}`, t);
      continue;
    }

    if (ends.length === 2) {
      const bothOne = x.card === '1' && y.card === '1';
      let manySide = x.card === 'N' ? x : y; // lado N (recibe la FK)
      let oneSide = manySide === x ? y : x;
      if (bothOne) {
        // 1:1: la FK puede ir en cualquiera de las dos tablas; `mask` elige el lado de cada relación.
        const idx = oneToOne.indexOf(r);
        const swap = idx >= 0 && ((mask >> idx) & 1) === 1;
        manySide = swap ? y : x;
        oneSide = swap ? x : y;
      }
      const t = getTable(manySide.entity);
      const reflexive = manySide.entity === oneSide.entity;
      for (const c of fkCols(oneSide.entity, false)) {
        addCol(t, reflexive ? { ...c, name: `${c.name}_${r.name}`, aliases: [...(c.aliases ?? []), c.name, `${c.name}_${r.name}s`] } : c);
      }
      for (const a of relAttrs) addCol(t, { name: a.name, aliases: a.aliases });
    }
  }

  return { tables: [...tables.values()] };
}
