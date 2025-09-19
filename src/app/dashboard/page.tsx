
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/dashboard-header';
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ClipboardPenLine, ShoppingCart, Cpu, DatabaseBackup, Printer } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Production, WholeMilkReplenishment } from '@/types';


export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());

    if (typeof window !== 'undefined') {
        const storedProduction = localStorage.getItem('dailySupplyTrackerProduction');
        const storedReplenishments = localStorage.getItem('dailySupplyTrackerWholeMilkReplenishments');

        const productionHistory: Production[] = storedProduction ? JSON.parse(storedProduction) : [];
        const replenishmentHistory: WholeMilkReplenishment[] = storedReplenishments ? JSON.parse(storedReplenishments) : [];
        
        const totalReplenished = replenishmentHistory.reduce((sum, r) => sum + r.quantitySacos, 0);
        const totalUsedInKilos = productionHistory.reduce((sum, p) => sum + (p.wholeMilkKilos || 0), 0);
        const totalUsedInSacos = totalUsedInKilos / 25;
        const currentStockSacos = totalReplenished - totalUsedInSacos;
        const currentStockKilos = currentStockSacos * 25;

        const lowStockAlertShown = sessionStorage.getItem('lowStockAlertShown');

        if (currentStockKilos <= 5 && !lowStockAlertShown) {
            toast({
                title: "Alerta de Stock Bajo",
                description: `Quedan ${currentStockKilos.toLocaleString(undefined, {maximumFractionDigits:2})} kg de leche entera. Es hora de reabastecer.`,
                variant: "destructive",
            });
            sessionStorage.setItem('lowStockAlertShown', 'true');
        }
    }
  }, [toast]);

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6 space-y-6 bg-background">
        <Skeleton className="h-20 w-full rounded-lg" /> {/* Header Placeholder */}
        <main className="flex-grow grid grid-cols-2 md:grid-cols-3 gap-4 p-4 items-center">
            {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="w-full rounded-lg aspect-square" />
            ))}
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
    { title: "Exportar / Imprimir", icon: Printer, action: () => router.push('/dashboard/export') },
    { title: "Salvar y Leer", icon: DatabaseBackup, action: () => router.push('/dashboard/backup') },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 space-y-6 bg-background">
      <DashboardHeader />
      <main className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 p-4 items-center">
        {cardItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <Card
              key={item.title}
              role="button"
              tabIndex={0}
              onClick={item.action}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action?.(); } }}
              className={`flex flex-col items-center justify-center p-4 hover:shadow-xl transition-all duration-200 ease-in-out cursor-pointer h-auto aspect-square rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-md`}
              aria-label={item.title}
            >
              <IconComponent className="h-12 w-12 sm:h-16 sm:w-16 text-primary mb-3" strokeWidth={1.5} />
              <p className="text-sm sm:text-base font-semibold text-center text-foreground">{item.title}</p>
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
