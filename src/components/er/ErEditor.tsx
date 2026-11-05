'use client';

import { toPng } from 'html-to-image';
import {
  Background,
  Controls,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useRef, useState } from 'react';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { erEdgeTypes, erNodeTypes, type ErNodeData } from './ErParts';

type Kind = 'entity' | 'relationship' | 'attribute' | 'spec';
export interface DiagramAnswer {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const DEFAULTS: Record<Kind, ErNodeData> = {
  entity: { label: '', weak: false },
  relationship: { label: '', identifying: false },
  attribute: { label: '', key: false, partialKey: false, multi: false, derived: false },
  spec: { label: '', disjoint: true, total: false },
};

type PaletteKind = Kind | 'composite';

const PALETTE: { kind: PaletteKind; icon: string; label: string; extended?: boolean }[] = [
  { kind: 'entity', icon: '▭', label: 'Entidad' },
  { kind: 'relationship', icon: '◇', label: 'Relación' },
  { kind: 'attribute', icon: '⬭', label: 'Atributo' },
  { kind: 'composite', icon: '⬭⬭', label: 'Atrib. compuesto' },
  { kind: 'spec', icon: '◯', label: 'Especialización', extended: true },
];

const typeOf = (nodes: Node[], id: string) => nodes.find((n) => n.id === id)?.type;

function Editor({ initial, extended, onChange, free, height = 600 }: { initial?: DiagramAnswer; extended: boolean; onChange: (a: DiagramAnswer) => void; free?: boolean; height?: number }) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes] = useState<Node[]>((initial?.nodes as unknown as Node[]) ?? []);
  const [edges, setEdges] = useState<Edge[]>((initial?.edges as unknown as Edge[]) ?? []);
  const [msg, setMsg] = useState('');
  const counter = useRef(
    Math.max(0, ...(initial?.nodes ?? []).map((n) => Number(n.id.replace(/\D/g, '')) || 0), ...(initial?.edges ?? []).map((e) => Number(e.id.replace(/\D/g, '')) || 0)) + 1,
  );

  const emit = useCallback(
    (n: Node[], e: Edge[]) =>
      onChange({
        nodes: n.map((x) => ({ id: x.id, type: String(x.type), position: x.position, data: x.data })),
        edges: e.map((x) => ({ id: x.id, source: x.source, target: x.target, type: 'floating', data: x.data })),
      }),
    [onChange],
  );

  const onNodesChange: OnNodesChange = (changes) =>
    setNodes((ns) => {
      const next = applyNodeChanges(changes, ns);
      emit(next, edges);
      return next;
    });
  const onEdgesChange: OnEdgesChange = (changes) =>
    setEdges((es) => {
      const next = applyEdgeChanges(changes, es);
      emit(nodes, next);
      return next;
    });

  const addAt = (kind: PaletteKind, position: { x: number; y: number }) => {
    const id = () => `n${counter.current++}`;
    const fresh: Node[] = [];
    const freshEdges: Edge[] = [];
    if (kind === 'composite') {
      // Atributo compuesto: un atributo con dos sub-atributos ya conectados.
      const parent: Node = { id: id(), type: 'attribute', position, data: { ...DEFAULTS.attribute }, selected: true };
      fresh.push(parent);
      [-70, 70].forEach((dx) => {
        const child: Node = { id: id(), type: 'attribute', position: { x: position.x + dx - 10, y: position.y + 90 }, data: { ...DEFAULTS.attribute } };
        fresh.push(child);
        freshEdges.push({ id: `e${counter.current++}`, source: parent.id, target: child.id, type: 'floating', data: {} });
      });
    } else {
      fresh.push({ id: id(), type: kind, position, data: { ...DEFAULTS[kind] }, selected: true });
    }
    const nextN = [...nodes.map((n) => ({ ...n, selected: false })), ...fresh];
    const nextE = [...edges.map((e) => ({ ...e, selected: false })), ...freshEdges];
    setNodes(nextN);
    setEdges(nextE);
    emit(nextN, nextE);
  };
  const addAuto = (kind: PaletteKind) => {
    const i = nodes.length;
    addAt(kind, { x: 60 + (i % 5) * 170, y: 50 + Math.floor(i / 5) * 120 });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/er-kind') as PaletteKind;
    if (!kind || (kind === 'spec' && !extended)) return;
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addAt(kind, { x: p.x - 55, y: p.y - 22 });
  };

  const hasParent = (attrId: string, es: Edge[]) =>
    es.some((e) => {
      const other = e.source === attrId ? e.target : e.target === attrId ? e.source : null;
      if (!other) return false;
      const t = typeOf(nodes, other);
      return t === 'entity' || t === 'relationship' || (t === 'attribute' && e.target === attrId);
    });

  const onConnect = (c: Connection) => {
    setMsg('');
    if (!c.source || !c.target || c.source === c.target) return;
    const a = nodes.find((n) => n.id === c.source);
    const b = nodes.find((n) => n.id === c.target);
    if (!a || !b) return;
    const pair = [a.type, b.type].sort().join('|');
    const existing = edges.filter((e) => (e.source === c.source && e.target === c.target) || (e.source === c.target && e.target === c.source));
    // Una relación reflexiva se conecta dos veces a la misma entidad (una por cada rol).
    if (existing.length && !(pair === 'entity|relationship' && existing.length < 2)) {
      setMsg('Esos dos elementos ya están conectados.');
      return;
    }
    let source = c.source;
    let target = c.target;

    if (pair === 'entity|spec') {
      // Convención: superclase → círculo → subclases
      const spec = a.type === 'spec' ? a : b;
      const ent = a.type === 'entity' ? a : b;
      const parentExists = edges.some((e) => e.target === spec.id);
      source = parentExists ? spec.id : ent.id;
      target = parentExists ? ent.id : spec.id;
    } else if (pair === 'attribute|attribute') {
      // Atributo compuesto: el que ya tiene dueño es el padre; el libre es el sub-atributo.
      const aHas = hasParent(a.id, edges);
      const bHas = hasParent(b.id, edges);
      if (aHas && bHas) {
        setMsg('Un atributo solo puede pertenecer a un elemento. Para un atributo compuesto, conecta sub-atributos sin dueño.');
        return;
      }
      source = bHas ? b.id : a.id;
      target = bHas ? a.id : b.id;
    } else if (['entity|relationship', 'attribute|entity', 'attribute|relationship'].includes(pair)) {
      const attr = a.type === 'attribute' ? a : b.type === 'attribute' ? b : null;
      if (attr && hasParent(attr.id, edges)) {
        setMsg('Un atributo solo puede pertenecer a un elemento.');
        return;
      }
    } else {
      setMsg('Conexión no válida: las entidades se conectan con relaciones, atributos o especializaciones; los atributos con entidades, relaciones u otros atributos (compuestos).');
      return;
    }
    const edge: Edge = { id: `e${counter.current++}`, source, target, type: 'floating', data: existing.length ? { bend: 55 } : {} };
    const next = [...edges, edge];
    setEdges(next);
    emit(nodes, next);
  };

  const patchNode = (id: string, patch: Partial<ErNodeData>) => {
    const next = nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
    setNodes(next);
    emit(next, edges);
  };
  const patchEdge = (id: string, patch: Record<string, unknown>) => {
    const next = edges.map((e) => (e.id === id ? { ...e, data: { ...e.data, ...patch } } : e));
    setEdges(next);
    emit(nodes, next);
  };
  const removeSelected = () => {
    const ids = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    const nextE = edges.filter((e) => !e.selected && !ids.has(e.source) && !ids.has(e.target));
    const nextN = nodes.filter((n) => !ids.has(n.id));
    setNodes(nextN);
    setEdges(nextE);
    emit(nextN, nextE);
  };
  const clearAll = () => {
    if (!confirm('¿Borrar todo el diagrama?')) return;
    setNodes([]);
    setEdges([]);
    emit([], []);
  };

  const download = (href: string, name: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
  };
  const exportPng = async () => {
    const el = document.querySelector('.rf-wrap .react-flow__viewport') as HTMLElement | null;
    if (!el || nodes.length === 0) return setMsg('Dibuja algo antes de exportar la imagen.');
    try {
      const b = getNodesBounds(nodes);
      const w = Math.max(900, Math.round(b.width) + 160);
      const h = Math.max(560, Math.round(b.height) + 160);
      const vp = getViewportForBounds(b, w, h, 0.2, 2, 0.08);
      const url = await toPng(el, {
        backgroundColor: '#ffffff',
        width: w,
        height: h,
        pixelRatio: 2,
        style: { width: `${w}px`, height: `${h}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
        filter: (n) => !(n as HTMLElement).classList?.contains('react-flow__handle'),
      });
      download(url, 'modelo-entidad-relacion.png');
    } catch {
      setMsg('No se pudo generar la imagen. Intenta nuevamente.');
    }
  };
  const exportJson = () => {
    const data = JSON.stringify({ nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })), edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: 'floating', data: e.data })) }, null, 2);
    download(URL.createObjectURL(new Blob([data], { type: 'application/json' })), 'modelo-entidad-relacion.json');
  };
  const importJson = async (file: File) => {
    try {
      const j = JSON.parse(await file.text());
      if (!Array.isArray(j.nodes) || !Array.isArray(j.edges)) throw new Error();
      const ns = (j.nodes as Node[]).map((n) => ({ id: String(n.id), type: n.type, position: n.position, data: n.data }));
      const es = (j.edges as Edge[]).map((e) => ({ id: String(e.id), source: String(e.source), target: String(e.target), type: 'floating', data: e.data ?? {} }));
      counter.current = Math.max(counter.current, ...ns.map((n) => Number(n.id.replace(/\D/g, '')) || 0), ...es.map((e) => Number(e.id.replace(/\D/g, '')) || 0)) + 1;
      setNodes(ns);
      setEdges(es);
      emit(ns, es);
      setMsg('');
      setTimeout(() => fitView({ padding: 0.12 }), 60);
    } catch {
      setMsg('El archivo no es un diagrama válido.');
    }
  };

  const selNode = nodes.find((n) => n.selected);
  const selEdge = edges.find((e) => e.selected);
  const nd = selNode?.data as ErNodeData | undefined;
  const edgePair = selEdge ? [typeOf(nodes, selEdge.source), typeOf(nodes, selEdge.target)].sort().join('|') : '';
  const ed = (selEdge?.data ?? {}) as { card?: string; min?: string };

  return (
    <div className="er-layout">
      <div className="er-palette" aria-label="Formas">
        <h4>Formas</h4>
        {PALETTE.filter((p) => !p.extended || extended).map((p) => (
          <button
            key={p.kind}
            type="button"
            className="pal-item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/er-kind', p.kind);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => addAuto(p.kind)}
            title="Arrastra al lienzo o haz clic"
          >
            <span className="pal-icon">{p.icon}</span>
            {p.label}
          </button>
        ))}
        <p className="muted pal-help">Arrastra una forma al lienzo (o haz clic).</p>
        <div className="pal-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={removeSelected} disabled={!selNode && !selEdge}>Eliminar selección</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={clearAll}>Limpiar lienzo</button>
        </div>
        {free && (
          <div className="pal-actions">
            <h4>Archivo</h4>
            <button type="button" className="btn btn-sm" onClick={exportPng}>Descargar imagen (PNG)</button>
            <button type="button" className="btn btn-sm" onClick={exportJson}>Guardar archivo (.json)</button>
            <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>Abrir archivo…</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = '';
              }}
            />
          </div>
        )}
      </div>

      <div>
        <div className="rf-wrap" style={{ height }} onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={erNodeTypes}
            edgeTypes={erEdgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionMode={ConnectionMode.Loose}
            connectionRadius={50}
            deleteKeyCode={['Delete', 'Backspace']}
            fitView={!!initial?.nodes?.length}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.3}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="#e3e4e6" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        {msg && <p className="err">{msg}</p>}
      </div>

      <aside className="er-side">
        <h4>Propiedades</h4>
        {!selNode && !selEdge && <p className="muted">Selecciona un elemento. Para conectar, arrastra desde los puntos rojos que aparecen en el borde de una forma hasta otra forma.</p>}

        {selNode && nd && (
          <div className="stack">
            {selNode.type !== 'spec' && (
              <label>
                Nombre
                <input value={String(nd.label ?? '')} onChange={(e) => patchNode(selNode.id, { label: e.target.value })} autoFocus />
              </label>
            )}
            {selNode.type === 'entity' && (
              <label className="check"><input type="checkbox" checked={!!nd.weak} onChange={(e) => patchNode(selNode.id, { weak: e.target.checked })} /> Entidad débil (rectángulo doble)</label>
            )}
            {selNode.type === 'relationship' && (
              <label className="check"><input type="checkbox" checked={!!nd.identifying} onChange={(e) => patchNode(selNode.id, { identifying: e.target.checked })} /> Relación identificadora (rombo doble)</label>
            )}
            {selNode.type === 'attribute' && (
              <>
                <label className="check"><input type="checkbox" checked={!!nd.key} onChange={(e) => patchNode(selNode.id, { key: e.target.checked, partialKey: e.target.checked ? false : nd.partialKey })} /> Clave (subrayado)</label>
                <label className="check"><input type="checkbox" checked={!!nd.partialKey} onChange={(e) => patchNode(selNode.id, { partialKey: e.target.checked, key: e.target.checked ? false : nd.key })} /> Clave parcial (subrayado punteado)</label>
                <label className="check"><input type="checkbox" checked={!!nd.multi} onChange={(e) => patchNode(selNode.id, { multi: e.target.checked })} /> Multivaluado (doble óvalo)</label>
                <label className="check"><input type="checkbox" checked={!!nd.derived} onChange={(e) => patchNode(selNode.id, { derived: e.target.checked })} /> Derivado (óvalo punteado)</label>
                <p className="muted">Para un atributo compuesto usa la forma «Atrib. compuesto» (crea el atributo con dos sub-atributos). Puedes agregar más sub-atributos y conectarlos a este óvalo.</p>
              </>
            )}
            {selNode.type === 'spec' && (
              <>
                <label>
                  Restricción
                  <select value={nd.disjoint ? 'd' : 'o'} onChange={(e) => patchNode(selNode.id, { disjoint: e.target.value === 'd' })}>
                    <option value="d">Disyunta (d)</option>
                    <option value="o">Solapada (o)</option>
                  </select>
                </label>
                <label>
                  Participación
                  <select value={nd.total ? 't' : 'p'} onChange={(e) => patchNode(selNode.id, { total: e.target.value === 't' })}>
                    <option value="p">Parcial (línea simple)</option>
                    <option value="t">Total (línea doble)</option>
                  </select>
                </label>
                <p className="muted">Conecta primero la superclase y luego cada subclase.</p>
              </>
            )}
          </div>
        )}

        {selEdge && edgePair === 'entity|relationship' && (
          <div className="stack">
            <p className="muted">Cardinalidad junto a esta entidad (notación «look across»): con cuántas ocurrencias de <b>esta entidad</b> se asocia <b>una</b> ocurrencia de la otra.</p>
            <label>
              Mínimo
              <select value={ed.min ?? ''} onChange={(e) => patchEdge(selEdge.id, { min: e.target.value })}>
                <option value="">— elegir —</option>
                <option value="0">0 (opcional)</option>
                <option value="1">1 (obligatorio)</option>
              </select>
            </label>
            <label>
              Máximo
              <select value={ed.card ?? ''} onChange={(e) => patchEdge(selEdge.id, { card: e.target.value })}>
                <option value="">— elegir —</option>
                <option value="1">1 (uno)</option>
                <option value="N">M (muchos)</option>
              </select>
            </label>
          </div>
        )}
        {selEdge && edgePair === 'entity|spec' && <p className="muted">Línea de la especialización; se dibuja doble si la participación es total.</p>}
        {selEdge && edgePair !== 'entity|relationship' && edgePair !== 'entity|spec' && <p className="muted">Conexión seleccionada. «Eliminar selección» la borra.</p>}

        <h4>Guía rápida</h4>
        <ul className="legend">
          <li><b>(0,M)</b> junto a una entidad: una ocurrencia de la otra se asocia con 0 a muchas de esta.</li>
          <li><b>Clave:</b> subrayado · <b>Multivaluado:</b> doble óvalo · <b>Derivado:</b> punteado.</li>
          {extended && <li><b>Especialización:</b> superclase → círculo (d/o) → subclases.</li>}
          <li>Tecla <kbd>Supr</kbd> borra lo seleccionado.</li>
        </ul>
      </aside>
    </div>
  );
}

export default function ErEditor(props: { initial?: DiagramAnswer; extended: boolean; onChange: (a: DiagramAnswer) => void; free?: boolean; height?: number }) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}
