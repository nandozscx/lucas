
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Registro Semanal de Entregas - acopiapp',
  description: 'Registra nuevas entregas de productos de proveedores para la semana.',
};

export default function RegistryLayout({
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
