
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Estadísticas - acopiapp',
  description: 'Visualiza las estadísticas de tu operación.',
};

export default function StatisticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
