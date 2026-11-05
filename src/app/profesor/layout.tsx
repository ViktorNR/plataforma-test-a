import Header from '@/components/Header';
import { requireProfesor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProfesorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProfesor();
  return (
    <>
      <Header nombre={`${user.nombre} ${user.apellido}`} rol={user.rol} />
      <main className="container">{children}</main>
    </>
  );
}
