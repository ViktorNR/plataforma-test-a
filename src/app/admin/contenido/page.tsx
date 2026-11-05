import { typeLabel, WEEKS, exercisesOfWeek, getToggles } from '@/lib/content';
import { alternarContenido } from '../actions';

export default async function ContenidoPage() {
  const toggles = await getToggles();
  const on = (k: string) => toggles.get(k) !== false;
  const total = WEEKS.flatMap((w) => exercisesOfWeek(w.n)).length;
  const visibles = WEEKS.filter((w) => on(`week:${w.n}`)).flatMap((w) => exercisesOfWeek(w.n)).filter((e) => on(e.slug)).length;

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <form action={alternarContenido}>
      <input type="hidden" name="key" value={k} />
      <button className={`switch${on(k) ? ' on' : ''}`} aria-pressed={on(k)} aria-label={label} title={on(k) ? 'Habilitado: clic para ocultar' : 'Oculto: clic para habilitar'}>
        <span />
      </button>
    </form>
  );

  return (
    <div className="stack-lg">
      <div>
        <h1>Contenido</h1>
        <p className="muted">Activa o desactiva semanas y ejercicios. Lo desactivado deja de verse para los estudiantes (administradores y profesores siempre lo ven) y no cuenta en los indicadores.</p>
        <p><span className="pill good">{visibles} de {total} ejercicios visibles para los estudiantes</span></p>
      </div>

      <div className="stack">
        {WEEKS.map((w) => {
          const exs = exercisesOfWeek(w.n);
          const activos = exs.filter((e) => on(e.slug)).length;
          const semanaOn = on(`week:${w.n}`);
          return (
            <section key={w.n} className={`card${semanaOn ? '' : ' off'}`}>
              <div className="row-between">
                <div>
                  <h3 style={{ margin: 0 }}>Semana {w.n} · {w.title}</h3>
                  <small className="muted">{semanaOn ? `${activos} de ${exs.length} ejercicios habilitados` : 'Semana oculta para los estudiantes'}</small>
                </div>
                <Toggle k={`week:${w.n}`} label={`Semana ${w.n}`} />
              </div>
              <details className="gestion-det">
                <summary>Ver y ajustar los {exs.length} ejercicios</summary>
                <table className="table compact">
                  <tbody>
                    {exs.map((e) => (
                      <tr key={e.slug}>
                        <td><b>{e.title}</b></td>
                        <td className="muted">{typeLabel(e)}</td>
                        <td className="actions"><Toggle k={e.slug} label={e.title} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          );
        })}
      </div>
    </div>
  );
}
