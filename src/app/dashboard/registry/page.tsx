
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Delivery as DeliveryType, Provider } from '@/types'; // Removed VendorTotal, as it's no longer passed to SupplyDataView
import SupplyEntryForm, { type DailyRegistryFormData } from '@/components/supply-entry-form';
import SupplyDataView from '@/components/supply-data-view';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardList, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PROVIDERS_STORAGE_KEY = 'dailySupplyTrackerProviders';

export default function RegistryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  // const [vendorTotals, setVendorTotals] = useState<VendorTotal[]>([]); // Kept for now if RegistryPage itself needs it, but not passed down.
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedDeliveries = localStorage.getItem(DELIVERIES_STORAGE_KEY);
      if (storedDeliveries) {
        try {
          const parsedDeliveries = JSON.parse(storedDeliveries);
          if (Array.isArray(parsedDeliveries) && parsedDeliveries.every(d => 'id' in d && 'providerName' in d && 'date' in d && 'quantity' in d)) {
            setDeliveries(parsedDeliveries);
          } else {
            console.warn("Estructura de datos inválida en localStorage para entregas, limpiando.");
            localStorage.removeItem(DELIVERIES_STORAGE_KEY);
          }
        } catch (error) {
          console.error("Falló al parsear entregas desde localStorage", error);
          localStorage.removeItem(DELIVERIES_STORAGE_KEY);
        }
      }

      const storedProviders = localStorage.getItem(PROVIDERS_STORAGE_KEY);
      if (storedProviders) {
        try {
          const parsedProviders = JSON.parse(storedProviders);
           if (Array.isArray(parsedProviders) && parsedProviders.every(p => 'id' in p && 'name' in p && 'address' in p && 'phone' in p && 'price' in p && typeof p.price === 'number')) {
            setProviders(parsedProviders);
          } else {
            console.warn("Estructura de datos inválida en localStorage para proveedores, limpiando lista de proveedores.");
            localStorage.removeItem(PROVIDERS_STORAGE_KEY);
            setProviders([]); 
          }
        } catch (error) {
          console.error("Falló al parsear proveedores desde localStorage", error);
          localStorage.removeItem(PROVIDERS_STORAGE_KEY);
          setProviders([]); 
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(deliveries));

      const newDailyTotals: Record<string, number> = {};
      deliveries.forEach(delivery => {
        newDailyTotals[delivery.date] = (newDailyTotals[delivery.date] || 0) + delivery.quantity;
      });
      setDailyTotals(newDailyTotals);

      // The following vendorTotals calculation is for the RegistryPage's own state,
      // but it's not passed to SupplyDataView anymore for the weekly vendor totals tab.
      // SupplyDataView calculates its weekly vendor totals internally.
      // This can be removed if RegistryPage itself has no other use for all-time vendor totals.
      // const newVendorTotalsMap: Record<string, { totalQuantity: number }> = {};
      // deliveries.forEach(delivery => {
      //   if (!newVendorTotalsMap[delivery.providerName]) {
      //     newVendorTotalsMap[delivery.providerName] = { totalQuantity: 0 };
      //   }
      //   newVendorTotalsMap[delivery.providerName].totalQuantity += delivery.quantity;
      // });
      
      // const newVendorTotalsArray = Object.entries(newVendorTotalsMap)
      //   .map(([name, data]) => ({
      //     originalName: name,
      //     totalQuantity: data.totalQuantity,
      //   }))
      //   .sort((a, b) => a.originalName.localeCompare(b.originalName));
      // setVendorTotals(newVendorTotalsArray);
    }
  }, [deliveries, isClient]);

  const handleAddDeliveries = useCallback((data: DailyRegistryFormData) => {
    const dateStr = format(data.date, "yyyy-MM-dd");
    let deliveriesAddedCount = 0;
    const newDeliveries: DeliveryType[] = [];

    data.entries.forEach(entry => {
      if (entry.quantity !== undefined && entry.quantity !== null && entry.quantity > 0) {
        const newDelivery: DeliveryType = {
          id: crypto.randomUUID(),
          providerName: entry.providerName, 
          date: dateStr,
          quantity: entry.quantity,
        };
        newDeliveries.push(newDelivery);
        deliveriesAddedCount++;
      }
    });

    if (newDeliveries.length > 0) {
      setDeliveries(prev => [...newDeliveries, ...prev]);
    }

    if (deliveriesAddedCount > 0) {
      toast({
        title: "Entregas Registradas",
        description: `${deliveriesAddedCount} entrega(s) para el ${format(data.date, "PPP", { locale: es })} han sido registradas.`,
      });
    } else {
      toast({
        title: "Sin Entregas para Registrar",
        description: "No se ingresaron cantidades para la fecha seleccionada.",
        variant: "default",
      });
    }
  }, [toast]);
  

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow grid md:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-1 space-y-6">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-[600px] w-full rounded-lg" />
          </div>
        </main>
        <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
          <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg gap-4">
        <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al Panel
        </Link>
        <div className="text-center order-first sm:order-none mx-auto sm:mx-0">
          <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center justify-center">
            <ClipboardList className="mr-3 h-8 w-8" /> Registro de Entregas
          </h1>
          <p className="text-sm text-muted-foreground">Registro Semanal</p>
        </div>
        <div className="w-0 sm:w-auto"></div> 
      </header>

      <main className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="md:col-span-1 space-y-6">
          {providers.length === 0 ? (
             <Alert variant="destructive" className="shadow-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No hay proveedores registrados</AlertTitle>
              <AlertDescription>
                Por favor, añade proveedores en la sección "Proveedores" antes de registrar entregas.
                <Button asChild variant="link" className="p-0 h-auto ml-1 text-destructive hover:underline">
                  <Link href="/dashboard/providers">Ir a Proveedores</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <SupplyEntryForm onSubmitDeliveries={handleAddDeliveries} providers={providers} />
          )}
        </div>
        <div className="md:col-span-2 space-y-6">
          <SupplyDataView
            deliveries={deliveries}
            dailyTotals={dailyTotals}
            // vendorTotals prop removed
            providers={providers} 
          />
        </div>
      </main>
      
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
