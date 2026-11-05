import AuthForm from '@/components/AuthForm';
import AuthShell from '@/components/AuthShell';

export default function LoginPage() {
  return (
    <AuthShell title="Ingresa a tu cuenta" subtitle="Practica modelado de datos y SQL con corrección automática.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
