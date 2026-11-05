import Link from 'next/link';
import Icon from './Icon';
import NavLinks, { type NavItem } from './NavLinks';
import ThemeToggle from './ThemeToggle';

const STUDENT_AREA = ['/panel/semana', '/panel/ejercicio'];

export default function Header({ nombre, rol }: { nombre: string; rol: 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE'; current?: string }) {
  const tools: NavItem[] = [
    { href: '/panel/laboratorio', label: 'Laboratorio MySQL', icon: 'lab' },
    { href: '/panel/lienzo', label: 'Diseño E/R libre', icon: 'canvas' },
  ];
  const vistaEstudiante: NavItem = { href: '/panel', label: 'Vista estudiante', icon: 'student', exact: true, also: STUDENT_AREA };
  const items: NavItem[] =
    rol === 'ADMIN'
      ? [
          { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
          { href: '/admin/profesores', label: 'Profesores', icon: 'teachers' },
          { href: '/admin/cursos', label: 'Cursos (NRC)', icon: 'courses' },
          { href: '/admin/estudiantes', label: 'Estudiantes', icon: 'students' },
          { href: '/admin/periodos', label: 'Periodos', icon: 'periods' },
          { href: '/admin/contenido', label: 'Contenido', icon: 'content' },
          { href: '/profesor', label: 'Panel docente', icon: 'teacher' },
          vistaEstudiante,
          ...tools,
        ]
      : rol === 'PROFESOR'
        ? [{ href: '/profesor', label: 'Mis cursos', icon: 'teacher' }, vistaEstudiante, ...tools]
        : [{ href: '/panel', label: 'Inicio', icon: 'home', exact: true, also: STUDENT_AREA }, ...tools];
  const initials = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const rolLabel = rol === 'ADMIN' ? 'Administrador' : rol === 'PROFESOR' ? 'Profesor' : 'Estudiante';

  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href={rol === 'ADMIN' ? '/admin' : rol === 'PROFESOR' ? '/profesor' : '/panel'} className="brand" aria-label="Ir al inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_uandresbello.png" alt="Universidad Andrés Bello" width={110} height={44} />
          <span className="brand-sep" aria-hidden />
          <span className="brand-name">
            Base de Datos
            <small>ATDF103 · Práctica</small>
          </span>
        </Link>
        <NavLinks items={items} />
        <form action="/api/auth/logout" method="post" className="user">
          <ThemeToggle />
          <span className="avatar" aria-hidden>{initials}</span>
          <span className="user-name">{nombre}<small>{rolLabel}</small></span>
          <button className="btn btn-sm btn-quiet icon-btn" aria-label="Cerrar sesión" title="Cerrar sesión"><Icon name="logout" size={18} /></button>
        </form>
      </div>
    </header>
  );
}
