import type { ErAttr, ErModel, Feedback, FeedbackItem, FlowEdge, FlowNode } from '../types';
import { finish, key, nameSet } from './text';

const label = (n: FlowNode) => String(n.data?.label ?? '').trim();
const fmtCard = (min: unknown, max: unknown) => `(${min ?? '?'},${max === 'N' ? 'M' : (max ?? '?')})`;

export function gradeEr(answer: { nodes: FlowNode[]; edges: FlowEdge[] }, sol: ErModel): Feedback {
  const items: FeedbackItem[] = [];
  let earned = 0;
  let max = 0;
  let penalty = 0;

  const nodes = answer.nodes ?? [];
  const edges = answer.edges ?? [];
  if (nodes.length === 0) {
    return { score: 0, summary: 'El diagrama está vacío.', items: [{ ok: false, text: 'Agrega entidades, relaciones y atributos al lienzo.' }] };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighbors = (id: string) =>
    edges
      .flatMap((e) => (e.source === id ? [byId.get(e.target)] : e.target === id ? [byId.get(e.source)] : []))
      .filter((n): n is FlowNode => !!n);

  // ---- Entidades ----
  const sEntities = nodes.filter((n) => n.type === 'entity');
  const used = new Set<string>();
  const entNode = new Map<string, FlowNode>(); // nombre solución -> nodo
  const solNameOf = new Map<string, string>(); // id nodo -> nombre solución
  for (const e of sol.entities) {
    max += 2 + (e.weak ? 1 : 0);
    const names = nameSet(e.name, e.aliases);
    const found = sEntities.find((n) => !used.has(n.id) && names.has(key(label(n))));
    if (found) {
      used.add(found.id);
      entNode.set(e.name, found);
      solNameOf.set(found.id, e.name);
      earned += 2;
      let ok = true;
      if (e.weak) {
        if (found.data?.weak) earned += 1;
        else {
          ok = false;
          items.push({ ok: false, text: `«${e.name}» es una entidad débil (rectángulo doble).` });
        }
      } else if (found.data?.weak) {
        ok = false;
        earned -= 1;
        items.push({ ok: false, text: `«${e.name}» no es una entidad débil.` });
      }
      if (ok) items.push({ ok: true, text: `Entidad «${e.name}» presente.` });
    } else {
      items.push({ ok: false, text: `Falta la entidad «${e.name}» (revisa el nombre).` });
    }
  }
  for (const n of sEntities) {
    if (!used.has(n.id)) {
      penalty += 1;
      items.push({ ok: false, text: `La entidad «${label(n) || 'sin nombre'}» no corresponde al enunciado o está mal nombrada.` });
    }
  }

  // ---- Atributos (con soporte de atributos compuestos) ----
  const usedAttr = new Set<string>();
  const attrPoints = (a: ErAttr, flags: boolean): number =>
    1 + (flags ? (a.key ? 1 : 0) + (a.partialKey ? 1 : 0) + (a.multi ? 1 : 0) + (a.derived ? 1 : 0) : 0) + (a.parts ?? []).reduce((n, p) => n + attrPoints(p, flags), 0);

  const gradeAttrs = (ownerName: string, owner: FlowNode | undefined, attrs: ErAttr[], flags: boolean) => {
    if (!attrs.length) return;
    if (!owner) {
      max += attrs.reduce((n, a) => n + attrPoints(a, flags), 0);
      items.push({ ok: false, text: `Atributos de «${ownerName}»: no evaluados porque falta ese elemento.` });
      return;
    }
    const available = neighbors(owner.id).filter((n) => n.type === 'attribute');
    for (const a of attrs) {
      const own = 1 + (flags ? (a.key ? 1 : 0) + (a.partialKey ? 1 : 0) + (a.multi ? 1 : 0) + (a.derived ? 1 : 0) : 0);
      max += own;
      const names = nameSet(a.name, a.aliases);
      const found = available.find((n) => !usedAttr.has(n.id) && names.has(key(label(n))));
      if (!found) {
        items.push({ ok: false, text: `Falta el atributo «${a.name}» de «${ownerName}».` });
        if (a.parts?.length) gradeAttrs(a.name, undefined, a.parts, flags);
        continue;
      }
      usedAttr.add(found.id);
      earned += 1;
      const problems: string[] = [];
      if (flags) {
        const check = (flag: 'key' | 'partialKey' | 'multi' | 'derived', want: boolean | undefined, text: string) => {
          const has = !!found.data?.[flag];
          if (want) {
            if (has) earned += 1;
            else problems.push(`debe ser ${text}`);
          } else if (has) {
            earned -= 1;
            problems.push(`no debería ser ${text}`);
          }
        };
        check('key', a.key, 'clave (identificador)');
        check('partialKey', a.partialKey, 'clave parcial');
        check('multi', a.multi, 'multivaluado');
        check('derived', a.derived, 'derivado');
      }
      items.push(
        problems.length
          ? { ok: false, text: `Atributo «${a.name}» de «${ownerName}»: ${problems.join(' y ')}.` }
          : { ok: true, text: `Atributo «${a.name}» de «${ownerName}» correcto.` },
      );
      if (a.parts?.length) gradeAttrs(a.name, found, a.parts, flags);
    }
    for (const n of available) {
      if (!usedAttr.has(n.id)) items.push({ ok: true, text: `Atributo adicional «${label(n)}» en «${ownerName}» (no se evalúa).` });
    }
  };
  for (const e of sol.entities) gradeAttrs(e.name, entNode.get(e.name), e.attrs, true);

  // ---- Relaciones ----
  const sRels = nodes.filter((n) => n.type === 'relationship');
  const usedRel = new Set<string>();
  for (const r of sol.relationships) {
    max += 2 + (r.identifying ? 1 : 0) + r.between.reduce((n) => n + 1, 0) + r.between.filter((b) => b.min !== undefined).length;
    const wanted = r.between.map((b) => b.entity).sort();
    const found = sRels.find((n) => {
      if (usedRel.has(n.id)) return false;
      const ents = neighbors(n.id)
        .filter((x) => x.type === 'entity')
        .map((x) => solNameOf.get(x.id) ?? '?')
        .sort();
      return ents.length === wanted.length && ents.every((v, i) => v === wanted[i]);
    });
    const title = wanted.join(' – ');
    if (!found) {
      items.push({ ok: false, text: `Falta una relación entre ${wanted.join(' y ')}.` });
      gradeAttrs(r.name, undefined, r.attrs ?? [], false);
      continue;
    }
    usedRel.add(found.id);
    earned += 2;
    if (r.identifying) {
      if (found.data?.identifying) earned += 1;
      else items.push({ ok: false, text: `La relación entre ${title} es identificadora (rombo doble).` });
    }
    items.push({ ok: true, text: `Relación entre ${title} presente.` });
    const ends = [...r.between];
    for (const edge of edges) {
      if (edge.source !== found.id && edge.target !== found.id) continue;
      const otherId = edge.source === found.id ? edge.target : edge.source;
      const gotMax = String(edge.data?.card ?? '');
      const gotMin = String(edge.data?.min ?? '');
      const sameEntity = (b: (typeof ends)[number]) => b.entity === solNameOf.get(otherId);
      // En relaciones reflexivas hay dos extremos sobre la misma entidad: se empareja el que coincide.
      let idx = ends.findIndex((b) => sameEntity(b) && b.card === gotMax && (b.min === undefined || String(b.min) === gotMin));
      if (idx < 0) idx = ends.findIndex(sameEntity);
      if (idx < 0) continue;
      const [end] = ends.splice(idx, 1);
      if (!gotMax || (end.min !== undefined && gotMin === '')) {
        items.push({ ok: false, text: `Falta indicar la cardinalidad (mín,máx) del lado de «${end.entity}» (relación ${title}).` });
        continue;
      }
      const maxOk = gotMax === end.card;
      const minOk = end.min === undefined || gotMin === String(end.min);
      if (maxOk) earned += 1;
      if (end.min !== undefined && minOk) earned += 1;
      items.push(
        maxOk && minOk
          ? { ok: true, text: `Cardinalidad del lado de «${end.entity}» correcta ${fmtCard(edge.data?.min, gotMax)}.` }
          : { ok: false, text: `Revisa la cardinalidad del lado de «${end.entity}» en la relación ${title}${!maxOk && !minOk ? ' (mínimo y máximo)' : !maxOk ? ' (el máximo)' : ' (el mínimo: ¿participación obligatoria u opcional?)'}.` },
      );
    }
    for (const rest of ends) items.push({ ok: false, text: `La relación ${title} no está conectada a «${rest.entity}».` });
    gradeAttrs(r.name, found, r.attrs ?? [], false);
  }
  for (const n of sRels) {
    if (!usedRel.has(n.id)) {
      penalty += 1;
      items.push({ ok: false, text: `La relación «${label(n) || 'sin nombre'}» no corresponde al enunciado.` });
    }
  }

  // ---- Especializaciones ----
  const sSpecs = nodes.filter((n) => n.type === 'spec');
  const usedSpec = new Set<string>();
  for (const sp of sol.specializations ?? []) {
    max += 4;
    const parentOf = (n: FlowNode) =>
      edges
        .filter((e) => e.target === n.id && byId.get(e.source)?.type === 'entity')
        .map((e) => solNameOf.get(e.source))
        .filter((x): x is string => !!x);
    const childrenOf = (n: FlowNode) =>
      edges
        .filter((e) => e.source === n.id && byId.get(e.target)?.type === 'entity')
        .map((e) => solNameOf.get(e.target))
        .filter((x): x is string => !!x);
    const found = sSpecs.find((n) => !usedSpec.has(n.id) && parentOf(n).includes(sp.parent));
    if (!found) {
      items.push({
        ok: false,
        text: `Falta la especialización de «${sp.parent}». Dibuja una línea desde la superclase hacia el círculo de especialización y desde el círculo hacia cada subclase.`,
      });
      continue;
    }
    usedSpec.add(found.id);
    const kids = new Set(childrenOf(found));
    const want = new Set(sp.children);
    const missing = [...want].filter((c) => !kids.has(c));
    const extra = [...kids].filter((c) => !want.has(c));
    if (!missing.length && !extra.length) {
      earned += 2;
      items.push({ ok: true, text: `Especialización de «${sp.parent}» con sus subclases correcta.` });
    } else {
      earned += 1;
      items.push({
        ok: false,
        text: `Subclases de «${sp.parent}» incorrectas${missing.length ? `: faltan ${missing.join(', ')}` : ''}${extra.length ? `; sobran ${extra.join(', ')}` : ''}.`,
      });
    }
    if (!!found.data?.disjoint === sp.disjoint) {
      earned += 1;
      items.push({ ok: true, text: `Restricción ${sp.disjoint ? 'disyunta (d)' : 'solapada (o)'} correcta.` });
    } else {
      items.push({ ok: false, text: `Revisa si la especialización de «${sp.parent}» es disyunta (d) o solapada (o).` });
    }
    if (!!found.data?.total === sp.total) {
      earned += 1;
      items.push({ ok: true, text: `Participación ${sp.total ? 'total' : 'parcial'} correcta.` });
    } else {
      items.push({ ok: false, text: `Revisa si la especialización de «${sp.parent}» es total o parcial.` });
    }
  }
  for (const n of sSpecs) {
    if (!usedSpec.has(n.id)) {
      penalty += 1;
      items.push({ ok: false, text: 'Hay un símbolo de especialización que no corresponde al enunciado.' });
    }
  }

  // ---- Elementos sueltos ----
  const attached = (n: FlowNode, seen = new Set<string>()): boolean => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return neighbors(n.id).some((x) => x.type === 'entity' || x.type === 'relationship' || (x.type === 'attribute' && attached(x, seen)));
  };
  for (const n of nodes.filter((x) => x.type === 'attribute')) {
    if (!attached(n)) items.push({ ok: false, text: `El atributo «${label(n) || 'sin nombre'}» no está conectado a ninguna entidad o relación.` });
  }

  return finish(earned, max, penalty, items);
}
