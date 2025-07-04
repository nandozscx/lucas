
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Salvar y Leer - acopiapp',
  description: 'Salva y lee los datos de tu aplicación.',
};

export default function BackupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
