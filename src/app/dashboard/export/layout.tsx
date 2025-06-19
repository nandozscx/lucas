
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Opciones de Exportación - acopiapp',
  description: 'Selecciona un formato para exportar tus datos de entregas.',
};

export default function ExportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
