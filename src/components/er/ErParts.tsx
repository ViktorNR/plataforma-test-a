'use client';

import { BaseEdge, EdgeLabelRenderer, Handle, Position, useInternalNode, type EdgeProps, type InternalNode, type NodeProps } from '@xyflow/react';

export type ErNodeData = {
  label?: string;
  key?: boolean;
  partialKey?: boolean;
  multi?: boolean;
  derived?: boolean;
  weak?: boolean;
  identifying?: boolean;
  disjoint?: boolean;
  total?: boolean;
};

const Handles = () => (
  <>
    <Handle id="t" type="source" position={Position.Top} className="rf-h" />
    <Handle id="r" type="source" position={Position.Right} className="rf-h" />
    <Handle id="b" type="source" position={Position.Bottom} className="rf-h" />
    <Handle id="l" type="source" position={Position.Left} className="rf-h" />
  </>
);

function EntityNode({ data, selected }: NodeProps) {
  const d = data as ErNodeData;
  return (
    <div className={`rf-node rf-entity${d.weak ? ' weak' : ''}${selected ? ' sel' : ''}`}>
      {d.label || <span className="rf-empty">Entidad</span>}
      <Handles />
    </div>
  );
}

function RelationshipNode({ data, selected }: NodeProps) {
  const d = data as ErNodeData;
  return (
    <div className={`rf-node rf-rel${selected ? ' sel' : ''}`}>
      <svg width="140" height="80" viewBox="0 0 140 80" aria-hidden>
        <polygon points="70,3 137,40 70,77 3,40" />
        {d.identifying && <polygon points="70,11 123,40 70,69 17,40" />}
      </svg>
      <span>{d.label || <span className="rf-empty">Relación</span>}</span>
      <Handles />
    </div>
  );
}

function AttributeNode({ data, selected }: NodeProps) {
  const d = data as ErNodeData;
  return (
    <div className={`rf-node rf-attr${d.multi ? ' multi' : ''}${d.derived ? ' derived' : ''}${selected ? ' sel' : ''}`}>
      <span className={d.key ? 'rf-key' : d.partialKey ? 'rf-pkey' : undefined}>{d.label || <span className="rf-empty">atributo</span>}</span>
      <Handles />
    </div>
  );
}

function SpecNode({ data, selected }: NodeProps) {
  const d = data as ErNodeData;
  return (
    <div className={`rf-node rf-spec${selected ? ' sel' : ''}`} title={`${d.disjoint ? 'Disyunta' : 'Solapada'} · ${d.total ? 'Total' : 'Parcial'}`}>
      {d.disjoint ? 'd' : 'o'}
      <Handles />
    </div>
  );
}

export const erNodeTypes = { entity: EntityNode, relationship: RelationshipNode, attribute: AttributeNode, spec: SpecNode };

// ---------- Arista flotante: une los bordes de los nodos en línea recta ----------
function edgePoint(n: InternalNode, toward: { x: number; y: number }) {
  const w = n.measured.width ?? 0;
  const h = n.measured.height ?? 0;
  const p = n.internals.positionAbsolute;
  const cx = p.x + w / 2;
  const cy = p.y + h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  let t: number;
  if (n.type === 'attribute' || n.type === 'spec') t = 1 / Math.hypot(dx / (w / 2), dy / (h / 2));
  else if (n.type === 'relationship') t = 1 / (Math.abs(dx) / (w / 2) + Math.abs(dy) / (h / 2));
  else t = Math.min(dx ? w / 2 / Math.abs(dx) : Infinity, dy ? h / 2 / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
}

const centerOf = (n: InternalNode) => ({
  x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2,
  y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2,
});

function FloatingEdge({ id, source, target, data, selected }: EdgeProps) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t || !s.measured.width || !t.measured.width) return null;

  const bend = Number((data as { bend?: number } | undefined)?.bend ?? 0);
  const cs = centerOf(s);
  const ct = centerOf(t);
  // Aristas paralelas (relaciones reflexivas): se curvan con un punto de control desplazado.
  const ctrl = bend ? { x: (cs.x + ct.x) / 2 - ((ct.y - cs.y) / (Math.hypot(ct.x - cs.x, ct.y - cs.y) || 1)) * bend * 2, y: (cs.y + ct.y) / 2 + ((ct.x - cs.x) / (Math.hypot(ct.x - cs.x, ct.y - cs.y) || 1)) * bend * 2 } : null;
  const p1 = edgePoint(s, ctrl ?? ct);
  const p2 = edgePoint(t, ctrl ?? cs);
  const path = ctrl ? `M ${p1.x} ${p1.y} Q ${ctrl.x} ${ctrl.y} ${p2.x} ${p2.y}` : `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

  const isCard = (s.type === 'entity' && t.type === 'relationship') || (s.type === 'relationship' && t.type === 'entity');
  const parentToSpec = s.type === 'entity' && t.type === 'spec';
  const total = parentToSpec && !!(t.data as ErNodeData).total;
  const ed = (data ?? {}) as { card?: string; min?: string; view?: boolean };
  const hasMax = !!ed.card;
  const hasMin = ed.min !== undefined && ed.min !== '';
  const maxText = hasMax ? (ed.card === 'N' ? 'M' : ed.card) : '?';
  // En los diagramas de solo lectura, si el modelo no define el mínimo se muestra solo el máximo.
  const cardLabel = ed.view && !hasMin ? String(maxText) : hasMax || hasMin ? `(${hasMin ? ed.min : '?'},${maxText})` : '';

  // Etiqueta de cardinalidad cerca de la entidad
  const entityEnd = s.type === 'entity' ? p1 : p2;
  const otherEnd = s.type === 'entity' ? p2 : p1;
  const len = Math.hypot(otherEnd.x - entityEnd.x, otherEnd.y - entityEnd.y) || 1;
  const off = Math.min(34, len / 2);
  let lx = entityEnd.x + ((otherEnd.x - entityEnd.x) / len) * off;
  let ly = entityEnd.y + ((otherEnd.y - entityEnd.y) / len) * off;
  if (ctrl) {
    // Punto sobre la curva cuadrática a ~22% desde el extremo de la entidad.
    const t0 = s.type === 'entity' ? 0.22 : 0.78;
    lx = (1 - t0) * (1 - t0) * p1.x + 2 * (1 - t0) * t0 * ctrl.x + t0 * t0 * p2.x;
    ly = (1 - t0) * (1 - t0) * p1.y + 2 * (1 - t0) * t0 * ctrl.y + t0 * t0 * p2.y;
  }

  return (
    <>
      <BaseEdge id={id} path={path} interactionWidth={22} style={{ stroke: selected ? 'var(--unab-red)' : '#8d8e91', strokeWidth: total ? 6 : 1.4 }} />
      {total && <path d={path} stroke="#fff" strokeWidth={2.4} fill="none" style={{ pointerEvents: 'none' }} />}
      {isCard && (
        <EdgeLabelRenderer>
          <div className={`rf-card${(hasMax && hasMin) || ed.view ? '' : ' missing'}`} style={{ transform: `translate(-50%,-50%) translate(${lx}px,${ly + 12}px)` }}>
            {cardLabel || '(?,?)'}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const erEdgeTypes = { floating: FloatingEdge };
