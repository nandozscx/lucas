"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/dashboard-header';
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ClipboardPenLine, ShoppingCart, HistoryIcon, Cpu } from 'lucide-react';

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 bg-background">
        <Skeleton className="h-20 w-full rounded-lg" /> {/* Header Placeholder */}
        <main className="flex-grow grid grid-cols-2 gap-6 md:gap-8 p-4 md:p-8 items-center">
            <Skeleton className="w-full rounded-lg h-40 sm:h-auto sm:aspect-square" />
            <Skeleton className="w-full rounded-lg h-40 sm:h-auto sm:aspect-square" />
            <Skeleton className="w-full rounded-lg h-40 sm:h-auto sm:aspect-square" />
            <Skeleton className="w-full rounded-lg h-40 sm:h-auto sm:aspect-square" />
        </main>
        <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
            <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </footer>
      </div>
    );
  }

  const cardItems = [
    { title: "Operaciones", icon: ClipboardPenLine, action: () => router.push('/dashboard/registry') },
    { title: "Producción", icon: Cpu, action: () => router.push('/dashboard/production') },
    { title: "Ventas y Clientes", icon: ShoppingCart, action: () => router.push('/dashboard/sales-clients') },
    { title: "Historial", icon: HistoryIcon, action: () => router.push('/dashboard/history') },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 bg-background">
      <DashboardHeader />
      <main className="flex-grow grid grid-cols-2 gap-6 md:gap-8 p-4 md:p-8 items-center">
        {cardItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card
              key={item.title}
              role="button"
              tabIndex={0}
              onClick={item.action}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action?.(); } }}
              className="flex flex-col items-center justify-center p-4 hover:shadow-xl transition-all duration-200 ease-in-out cursor-pointer h-40 sm:h-auto sm:aspect-square rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-md"
              aria-label={item.title}
            >
              <IconComponent className="h-20 w-20 text-primary mb-3" strokeWidth={1.5} />
              <p className="text-lg font-semibold text-center text-foreground">{item.title}</p>
            </Card>
          );
        })}
      </main>
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {currentYear} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
