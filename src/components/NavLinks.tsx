'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Prefijos adicionales que también marcan este elemento como activo. */
  also?: string[];
  exact?: boolean;
}

/** Menú con íconos: solo la opción activa muestra su nombre; las demás lo muestran al pasar el cursor. */
export default function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname() ?? '';
  return (
    <nav className="nav" aria-label="Principal">
      {items.map((it) => {
        const active = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + '/') || (it.also ?? []).some((p) => path.startsWith(p));
        return (
          <Link key={it.href} href={it.href} className={active ? 'on' : undefined} aria-current={active ? 'page' : undefined} aria-label={it.label} data-label={it.label}>
            <Icon name={it.icon} />
            {active && <span className="nav-lbl">{it.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
