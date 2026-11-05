import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Práctica de Bases de Datos · ATDF103',
  description: 'Plataforma de ejercicios con corrección automática: modelo E/R, normalización y SQL.',
};

// Aplica el tema guardado (o el del sistema) antes de pintar, para evitar el parpadeo.
const TEMA = `try{var t=localStorage.getItem('tema');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
