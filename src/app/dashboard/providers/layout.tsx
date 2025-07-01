
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Redirigiendo...',
  description: 'Esta sección ha sido movida a Operaciones.',
};

export default function ProvidersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
