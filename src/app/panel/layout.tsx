import Header from '@/components/Header';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Header nombre={`${user.nombre} ${user.apellido}`} rol={user.rol} current="/panel" />
      <main className="container">{children}</main>
    </>
  );
}
