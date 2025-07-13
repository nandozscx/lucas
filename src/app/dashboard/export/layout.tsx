
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Exportar y Imprimir - acopiapp',
  description: 'Selecciona y genera reportes personalizados en formato PDF.',
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
