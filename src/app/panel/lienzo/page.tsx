import Link from 'next/link';
import FreeCanvas from '@/components/FreeCanvas';
import { requireUser } from '@/lib/auth';

export default async function LienzoPage() {
  await requireUser();
  return (
    <div className="stack-lg">
      <nav className="crumbs"><Link href="/panel">Inicio</Link> / Diseño libre</nav>
      <header className="page-head">
        <p className="eyebrow">Herramienta libre · sin puntaje</p>
        <h1>Diseña tu modelo Entidad-Relación</h1>
        <p className="lead">Un lienzo completamente limpio para modelar lo que quieras: entidades, relaciones, atributos (clave, multivaluado, derivado, compuesto), entidades débiles y especializaciones. Arrastra las formas desde la izquierda, conéctalas y descarga tu diseño.</p>
      </header>
      <FreeCanvas />
    </div>
  );
}
