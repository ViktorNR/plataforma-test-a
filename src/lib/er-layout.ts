import type { ErAttr, ErModel, FlowEdge, FlowNode, Pos } from './types';

const ENT = { w: 120, h: 44 };
const REL = { w: 140, h: 80 };
const SPEC = { w: 44, h: 44 };
const ATTR = { w: 110, h: 38 };
const COL_GAP = 500;
const ROW_GAP = 380;

const center = (p: Pos, s: { w: number; h: number }): Pos => ({ x: p.x + s.w / 2, y: p.y + s.h / 2 });
const deg = (rad: number) => ((rad * 180) / Math.PI + 360) % 360;
const angleTo = (from: Pos, to: Pos) => deg(Math.atan2(to.y - from.y, to.x - from.x));

/**
 * Reparte `n` posiciones alrededor de `c`, dentro del mayor hueco angular libre
 * (los ángulos bloqueados son las direcciones hacia elementos ya conectados).
 */
function placeAround(c: Pos, blocked: number[], n: number, baseRadius: number, defaultArc: [number, number] = [200, 340]): Pos[] {
  if (n === 0) return [];
  let start: number;
  let end: number;
  if (blocked.length === 0) {
    [start, end] = defaultArc;
  } else {
    const a = [...blocked].sort((x, y) => x - y);
    let bestGap = -1;
    start = 0;
    end = 0;
    for (let i = 0; i < a.length; i++) {
      const from = a[i];
      const to = i + 1 < a.length ? a[i + 1] : a[0] + 360;
      if (to - from > bestGap) {
        bestGap = to - from;
        start = from;
        end = to;
      }
    }
    const margin = Math.min(28, (end - start) / 4);
    start += margin;
    end -= margin;
  }
  const span = end - start;
  const needed = (n * (ATTR.w + 14)) / ((span * Math.PI) / 180 || 1);
  const radius = Math.min(300, Math.max(baseRadius, needed));
  return Array.from({ length: n }, (_, i) => {
    const a = ((start + (span * (i + 0.5)) / n) * Math.PI) / 180;
    return { x: c.x + Math.cos(a) * radius - ATTR.w / 2, y: c.y + Math.sin(a) * radius - ATTR.h / 2 };
  });
}

const sizeOf = (n: FlowNode) => {
  const label = String((n.data as { label?: string }).label ?? '');
  if (n.type === 'entity') return { w: Math.max(ENT.w, label.length * 8 + 36), h: ENT.h };
  if (n.type === 'relationship') return { w: Math.max(REL.w, label.length * 7 + 70), h: REL.h };
  if (n.type === 'spec') return SPEC;
  return { w: Math.max(ATTR.w, label.length * 7 + 34), h: ATTR.h };
};

/**
 * Separa los nodos que se superponen (entidades sobre relaciones, atributos unos sobre otros…).
 * Las entidades quedan fijas; relaciones, atributos y especializaciones se desplazan lo mínimo,
 * y los atributos se mantienen cerca de su dueño.
 */
function resolveOverlaps(nodes: FlowNode[], edges: FlowEdge[], pass = 0): void {
  const PAD = 16;
  const owner = new Map<string, string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) if (byId.get(e.target)?.type === 'attribute') owner.set(e.target, e.source);
  const sz = new Map(nodes.map((n) => [n.id, sizeOf(n)]));
  const fixed = (n: FlowNode) => n.type === 'entity';
  for (let it = 0; it < 400; it++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (fixed(a) && fixed(b)) continue;
        const sa = sz.get(a.id)!;
        const sb = sz.get(b.id)!;
        const cax = a.position.x + sa.w / 2;
        const cay = a.position.y + sa.h / 2;
        const cbx = b.position.x + sb.w / 2;
        const cby = b.position.y + sb.h / 2;
        const gx = Math.abs(cax - cbx) - (sa.w + sb.w) / 2 - PAD; // <0 → se solapan en x
        const gy = Math.abs(cay - cby) - (sa.h + sb.h) / 2 - PAD;
        if (gx >= 0 || gy >= 0) continue;
        moved = true;
        const alongX = gx > gy; // menor penetración
        const dir = alongX ? (cax === cbx ? (i % 2 ? 1 : -1) : Math.sign(cbx - cax)) : cay === cby ? (j % 2 ? 1 : -1) : Math.sign(cby - cay);
        const push = -(alongX ? gx : gy) + 1;
        // Los atributos ceden más que las relaciones y especializaciones; las entidades no se mueven.
        const wa = a.type === 'entity' ? 0 : a.type === 'attribute' ? 1 : 0.2;
        const wb = b.type === 'entity' ? 0 : b.type === 'attribute' ? 1 : 0.2;
        const ma = wa / (wa + wb);
        const mb = wb / (wa + wb);
        if (alongX) {
          a.position.x -= dir * push * ma;
          b.position.x += dir * push * mb;
        } else {
          a.position.y -= dir * push * ma;
          b.position.y += dir * push * mb;
        }
      }
    }
    // Los atributos no se alejan demasiado de su dueño.
    for (const n of nodes) {
      const o = byId.get(owner.get(n.id) ?? '');
      if (!o || n.type !== 'attribute') continue;
      const so = sz.get(o.id)!;
      const sn = sz.get(n.id)!;
      const dx = o.position.x + so.w / 2 - (n.position.x + sn.w / 2);
      const dy = o.position.y + so.h / 2 - (n.position.y + sn.h / 2);
      const d = Math.hypot(dx, dy);
      if (d > 230) {
        n.position.x += (dx / d) * (d - 230) * 0.1;
        n.position.y += (dy / d) * (d - 230) * 0.1;
      }
    }
    if (!moved) break;
  }
  // Segunda fase: ningún atributo debe tener su línea cruzando otro elemento; si ocurre, se busca otro ángulo libre alrededor del dueño.
  if (pass === 0) {
    const box = (n: FlowNode, p: Pos, pad: number) => {
      const s = sz.get(n.id)!;
      return { x1: p.x - pad, y1: p.y - pad, x2: p.x + s.w + pad, y2: p.y + s.h + pad };
    };
    const crosses = (from: Pos, to: Pos, skip: Set<string>, me: FlowNode) => {
      for (const m of nodes) {
        if (skip.has(m.id)) continue;
        const b = box(m, m.position, 4);
        for (let k = 0; k <= 24; k++) {
          const x = from.x + ((to.x - from.x) * k) / 24;
          const y = from.y + ((to.y - from.y) * k) / 24;
          if (x > b.x1 && x < b.x2 && y > b.y1 && y < b.y2) return true;
        }
      }
      void me;
      return false;
    };
    const overlapsAny = (n: FlowNode, p: Pos) => {
      const mine = box(n, p, PAD / 2);
      return nodes.some((m) => {
        if (m === n) return false;
        const o = box(m, m.position, PAD / 2);
        return mine.x1 < o.x2 && mine.x2 > o.x1 && mine.y1 < o.y2 && mine.y2 > o.y1;
      });
    };
    let changed = false;
    for (const n of nodes) {
      if (n.type !== 'attribute') continue;
      const o = byId.get(owner.get(n.id) ?? '');
      if (!o) continue;
      const so = sz.get(o.id)!;
      const sn = sz.get(n.id)!;
      const oc = { x: o.position.x + so.w / 2, y: o.position.y + so.h / 2 };
      const cur = { x: n.position.x + sn.w / 2, y: n.position.y + sn.h / 2 };
      const skip = new Set([o.id, n.id]);
      if (!crosses(oc, cur, skip, n)) continue;
      const curAng = (Math.atan2(cur.y - oc.y, cur.x - oc.x) * 180) / Math.PI;
      let best: { p: Pos; score: number } | null = null;
      for (const r of [130, 165, 200, 240]) {
        for (let a = 0; a < 360; a += 15) {
          const c = { x: oc.x + Math.cos((a * Math.PI) / 180) * r, y: oc.y + Math.sin((a * Math.PI) / 180) * r };
          const p = { x: c.x - sn.w / 2, y: c.y - sn.h / 2 };
          if (overlapsAny(n, p) || crosses(oc, c, skip, n)) continue;
          const diff = Math.abs(((a - curAng + 540) % 360) - 180);
          const score = diff + r / 10;
          if (!best || score < best.score) best = { p, score };
        }
      }
      if (best) {
        n.position = best.p;
        changed = true;
      }
    }
    if (changed) return resolveOverlaps(nodes, edges, 1);
  }
  for (const n of nodes) n.position = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
}

/** Pares de nodos que se superponen (sin contar entidad–entidad, que fija el ejercicio). Para pruebas. */
export function countOverlaps(nodes: FlowNode[]): string[] {
  const out: string[] = [];
  const name = (n: FlowNode) => String((n.data as { label?: string }).label);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.type === 'entity' && b.type === 'entity') continue;
      const sa = sizeOf(a);
      const sb = sizeOf(b);
      const ox = Math.abs(a.position.x + sa.w / 2 - b.position.x - sb.w / 2) < (sa.w + sb.w) / 2;
      const oy = Math.abs(a.position.y + sa.h / 2 - b.position.y - sb.h / 2) < (sa.h + sb.h) / 2;
      if (ox && oy) out.push(`${name(a)}/${name(b)}`);
    }
  }
  return out;
}

/** Convierte un ErModel en nodos y aristas de React Flow (para mostrar modelos de solo lectura). */
export function toFlow(model: ErModel): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const entId = (name: string) => `e:${name}`;
  const edgeKey = new Map<string, number>();
  const addEdge = (source: string, target: string, data?: Record<string, unknown>) => {
    const k = `${source}->${target}`;
    const n = edgeKey.get(k) ?? 0;
    edgeKey.set(k, n + 1);
    edges.push({ id: `${k}#${n}`, source, target, type: 'floating', data: n > 0 ? { ...data, bend: 55 * n } : data });
  };

  // ---- 1. Posición de las entidades ----
  const children = new Set((model.specializations ?? []).flatMap((s) => s.children));
  const pos = new Map<string, Pos>();
  if (model.layout) {
    model.layout.forEach((row, r) => row.forEach((name, c) => name && pos.set(name, { x: c * COL_GAP, y: r * ROW_GAP })));
  }
  let auto = 0;
  for (const e of model.entities) {
    if (e.pos) pos.set(e.name, e.pos);
    else if (!pos.has(e.name)) {
      const cols = 3;
      pos.set(e.name, { x: (auto % cols) * COL_GAP, y: Math.floor(auto / cols) * ROW_GAP });
      auto++;
    }
  }

  // ---- 2. Relaciones: posición y conexiones ----
  const relPos: Pos[] = [];
  const perPair = new Map<string, number>();
  const reflexive: number[] = [];
  model.relationships.forEach((r, i) => {
    const ents = [...new Set(r.between.map((b) => b.entity))];
    const centers = ents.map((n) => center(pos.get(n) ?? { x: 0, y: 0 }, ENT));
    let c: Pos;
    if (r.pos) c = center(r.pos, REL);
    else if (ents.length === 1) {
      // Las reflexivas se ubican después, buscando el hueco más libre alrededor de la entidad.
      reflexive.push(i);
      return;
    } else {
      const mx = centers.reduce((s, p) => s + p.x, 0) / centers.length;
      const my = centers.reduce((s, p) => s + p.y, 0) / centers.length;
      const key = ents.slice().sort().join('|');
      const k = perPair.get(key) ?? 0;
      perPair.set(key, k + 1);
      // Separa relaciones paralelas entre el mismo par, perpendicularmente a la línea que las une.
      const dx = centers.length >= 2 ? centers[1].x - centers[0].x : 1;
      const dy = centers.length >= 2 ? centers[1].y - centers[0].y : 0;
      const len = Math.hypot(dx, dy) || 1;
      const off = (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 120;
      c = { x: mx - (dy / len) * off, y: my + (dx / len) * off };
    }
    relPos[i] = { x: c.x - REL.w / 2, y: c.y - REL.h / 2 };
  });
  for (const i of reflexive) {
    const owner = model.relationships[i].between[0].entity;
    const base = center(pos.get(owner) ?? { x: 0, y: 0 }, ENT);
    const others: Pos[] = [
      ...relPos.filter(Boolean).map((p) => center(p, REL)),
      ...[...pos.entries()].filter(([n]) => n !== owner).map(([, p]) => center(p, ENT)),
    ];
    let best = { x: base.x + 260, y: base.y - 30 };
    let bestScore = -1;
    for (let a = 0; a < 360; a += 30) {
      const cand = { x: base.x + Math.cos((a * Math.PI) / 180) * 250, y: base.y + Math.sin((a * Math.PI) / 180) * 250 };
      const score = Math.min(...others.map((o) => Math.hypot(o.x - cand.x, o.y - cand.y)), 999);
      if (score > bestScore) {
        bestScore = score;
        best = cand;
      }
    }
    relPos[i] = { x: best.x - REL.w / 2, y: best.y - REL.h / 2 };
  }

  // ---- 3. Nodos de entidad, atributos ----
  const blockedFor = new Map<string, number[]>();
  const block = (name: string, to: Pos) => {
    const c = center(pos.get(name) ?? { x: 0, y: 0 }, ENT);
    (blockedFor.get(name) ?? blockedFor.set(name, []).get(name)!).push(angleTo(c, to));
  };
  model.relationships.forEach((r, i) => r.between.forEach((b) => block(b.entity, center(relPos[i], REL))));

  const specPos: Pos[] = [];
  (model.specializations ?? []).forEach((s, i) => {
    const p = pos.get(s.parent) ?? { x: 0, y: 0 };
    const kids = s.children.map((n) => pos.get(n)).filter((x): x is Pos => !!x);
    const cx = kids.length ? kids.reduce((a, k) => a + k.x, 0) / kids.length : p.x;
    const sp = s.pos ?? { x: cx + ENT.w / 2 - SPEC.w / 2, y: p.y + 150 };
    specPos[i] = sp;
    block(s.parent, center(sp, SPEC));
    for (const k of s.children) block(k, center(sp, SPEC));
  });

  const addAttrs = (ownerId: string, c: Pos, attrs: ErAttr[], blocked: number[], radius: number, fallbackArc?: [number, number]) => {
    const spots = placeAround(c, blocked, attrs.length, radius, fallbackArc);
    attrs.forEach((a, i) => {
      const id = `a:${ownerId}:${a.name}`;
      nodes.push({
        id,
        type: 'attribute',
        position: spots[i],
        data: { label: a.name, key: !!a.key, partialKey: !!a.partialKey, multi: !!a.multi, derived: !!a.derived },
      });
      addEdge(ownerId, id);
      if (a.parts?.length) {
        const ac = center(spots[i], ATTR);
        addAttrs(id, ac, a.parts, [angleTo(ac, c)], 105);
      }
    });
  };

  for (const e of model.entities) {
    const p = pos.get(e.name)!;
    nodes.push({ id: entId(e.name), type: 'entity', position: p, data: { label: e.name, weak: !!e.weak } });
    const blocked = [...(blockedFor.get(e.name) ?? [])];
    addAttrs(entId(e.name), center(p, ENT), e.attrs, blocked, 120, e.arc);
  }

  model.relationships.forEach((r, i) => {
    const id = `r:${i}`;
    nodes.push({ id, type: 'relationship', position: relPos[i], data: { label: r.name, identifying: !!r.identifying } });
    for (const b of r.between) addEdge(entId(b.entity), id, { card: b.card, min: b.min === undefined ? undefined : String(b.min), view: true });
    if (r.attrs?.length) {
      const rc = center(relPos[i], REL);
      const blocked = [...new Set(r.between.map((b) => b.entity))].map((n) => angleTo(rc, center(pos.get(n) ?? { x: 0, y: 0 }, ENT)));
      addAttrs(id, rc, r.attrs, blocked, 100, r.arc);
    }
  });

  (model.specializations ?? []).forEach((s, i) => {
    const id = `s:${i}`;
    nodes.push({ id, type: 'spec', position: specPos[i], data: { label: '', disjoint: s.disjoint, total: s.total } });
    addEdge(entId(s.parent), id);
    for (const c of s.children) addEdge(id, entId(c));
  });

  resolveOverlaps(nodes, edges);
  return { nodes, edges };
}
