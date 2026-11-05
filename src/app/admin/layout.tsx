import Header from '@/components/Header';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <>
      <Header nombre={`${user.nombre} ${user.apellido}`} rol="ADMIN" />
      <main className="container">{children}</main>
    </>
  );
}
