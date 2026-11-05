import Link from 'next/link';
import Workbench from '@/components/Workbench';
import { requireUser } from '@/lib/auth';

export default async function LaboratorioPage() {
  await requireUser();
  return (
    <div className="stack-lg">
      <nav className="crumbs"><Link href="/panel">Inicio</Link> / Laboratorio MySQL</nav>
      <header className="page-head">
        <p className="eyebrow">Herramienta libre · sin puntaje</p>
        <h1>Laboratorio MySQL</h1>
        <p className="lead">Un entorno tipo MySQL Workbench en tu navegador: crea bases de datos, tablas, consultas simples y complejas, vistas, procedimientos almacenados, funciones y triggers. Tus bases de datos son privadas y se conservan entre sesiones.</p>
      </header>
      <Workbench />
    </div>
  );
}
