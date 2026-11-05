import { ESTADO_LABEL, type DiaActividad, type Estado } from '@/lib/indicadores';

/** Variación respecto del periodo anterior: ▲ +3 / ▼ −2 / = */
export function Delta({ actual, previo, sufijo = '' }: { actual: number; previo: number; sufijo?: string }) {
  const d = actual - previo;
  if (d === 0) return <small className="delta">= igual que la semana anterior</small>;
  return <small className={`delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲ +' : '▼ −'}{Math.abs(d)}{sufijo} vs. semana anterior</small>;
}

export function Kpi({ valor, titulo, detalle, tono, extra }: { valor: string | number; titulo: string; detalle?: string; tono?: 'good' | 'low' | 'mid'; extra?: React.ReactNode }) {
  return (
    <div className={`card kpi${tono ? ` kpi-${tono}` : ''}`}>
      <b>{valor}</b>
      <span>{titulo}</span>
      {detalle && <small className="muted">{detalle}</small>}
      {extra}
    </div>
  );
}

export function EstadoPill({ estado }: { estado: Estado }) {
  const tono = estado === 'activo' ? 'good' : estado === 'inactivo' ? 'mid' : 'low';
  return <span className={`pill ${tono}`}>{ESTADO_LABEL[estado]}</span>;
}

export const heatClass = (v: number, total = 1) => (total === 0 ? 'heat-na' : v === 0 ? 'heat0' : v < 34 ? 'heat1' : v < 67 ? 'heat2' : 'heat3');

/** Barra horizontal con porcentaje. */
export function Barra({ valor, tono }: { valor: number; tono?: 'good' | 'mid' | 'low' }) {
  const t = tono ?? (valor >= 67 ? 'good' : valor >= 34 ? 'mid' : 'low');
  return (
    <div className="bar-cell" title={`${valor}%`}>
      <div className="bar"><span className={`bar-${t}`} style={{ width: `${Math.min(100, valor)}%` }} /></div>
      <b>{valor}%</b>
    </div>
  );
}

/** Intentos por día de los últimos 30 días (gráfico de columnas en SVG, sin librerías). */
export function GraficoActividad({ datos, unidad = 'intentos', color = 'var(--red)' }: { datos: DiaActividad[]; unidad?: string; color?: string }) {
  const max = Math.max(1, ...datos.map((d) => d.intentos));
  const w = 600;
  const h = 150;
  const bw = w / datos.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className="chart" role="img" aria-label="Intentos por día en los últimos 30 días">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={0} x2={w} y1={h - h * f} y2={h - h * f} style={{ stroke: 'var(--line)' }} strokeWidth={1} />
      ))}
      {datos.map((d, i) => {
        const alto = (d.intentos / max) * (h - 6);
        return (
          <g key={d.dia}>
            <title>{`${d.dia}: ${d.intentos} ${unidad} · ${d.alumnos} estudiantes`}</title>
            <rect x={i * bw + 2} y={h - alto} width={bw - 4} height={Math.max(alto, d.intentos ? 2 : 0)} rx={2} style={{ fill: color }} opacity={d.intentos ? 1 : 0.15} />
            {(i % 5 === 0 || i === datos.length - 1) && (
              <text x={i * bw + bw / 2} y={h + 15} textAnchor="middle" fontSize={10} style={{ fill: 'var(--muted)' }}>
                {d.dia.slice(8)}/{d.dia.slice(5, 7)}
              </text>
            )}
          </g>
        );
      })}
      <text x={w - 2} y={10} textAnchor="end" fontSize={10} style={{ fill: 'var(--muted)' }}>máx. {max}</text>
    </svg>
  );
}

export function Histograma({ datos }: { datos: { rango: string; alumnos: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.alumnos));
  return (
    <div className="hist">
      {datos.map((d) => (
        <div key={d.rango} className="hist-col" title={`${d.alumnos} estudiantes`}>
          <b>{d.alumnos}</b>
          <span style={{ height: `${(d.alumnos / max) * 100}%` }} />
          <small>{d.rango}</small>
        </div>
      ))}
    </div>
  );
}
