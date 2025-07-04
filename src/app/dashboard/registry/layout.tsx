
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Operaciones - acopiapp',
  description: 'Gestiona las entregas de proveedores y la información de los mismos.',
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
