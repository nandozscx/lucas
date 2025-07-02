
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { GlobalVoiceButton } from '@/components/global-voice-button';

export const metadata: Metadata = {
  title: 'acopiapp', 
  description: 'Rastrea entregas diarias de suministros de proveedores.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
      <GlobalVoiceButton />
    </>
  );
}
