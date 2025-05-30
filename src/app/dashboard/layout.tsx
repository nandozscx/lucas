
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'Daily Supply Tracker',
  description: 'Track daily supply deliveries from vendors.',
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
    </>
  );
}
