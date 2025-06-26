
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Ventas y Clientes - acopiapp',
  description: 'Gestiona tus ventas y clientes.',
};

export default function SalesClientsLayout({
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
