import ThemeToggle from './ThemeToggle';

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_uandresbello.png" alt="Universidad Andrés Bello" width={230} height={92} />
        </div>
        <div className="auth-pitch">
          <p className="eyebrow light">ATDF103 · Base de Datos</p>
          <h1>Practica, equivócate y aprende con corrección inmediata</h1>
          <ul className="ticks">
            <li>Dibuja modelos Entidad-Relación como en erdplus</li>
            <li>Transforma, normaliza y crea bases de datos reales</li>
            <li>Escribe consultas, vistas y procedimientos que se corrigen en MySQL real</li>
            <li>Laboratorio MySQL para experimentar sin límites</li>
          </ul>
        </div>
        <p className="auth-foot">216 ejercicios · 13 semanas · unas 80 horas de práctica si partes de cero · corrección automática</p>
      </section>
      <section className="auth-card">
        <div className="auth-theme"><ThemeToggle /></div>
        <div className="auth-inner">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
