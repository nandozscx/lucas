
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Delivery as DeliveryType, VendorTotal, Provider } from '@/types';
import SupplyEntryForm, { type DailyRegistryFormData } from '@/components/supply-entry-form';
import SupplyDataView from '@/components/supply-data-view';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardList, AlertTriangle } from 'lucide-react';
// AlertDialog ya no es necesario aquí
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Importar locale es

const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PROVIDERS_STORAGE_KEY = 'dailySupplyTrackerProviders';

export default function RegistryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  const [vendorTotals, setVendorTotals] = useState<VendorTotal[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  // deliveryToDelete y AlertDialog ya no son necesarios


  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      // Load Deliveries
      const storedDeliveries = localStorage.getItem(DELIVERIES_STORAGE_KEY);
      if (storedDeliveries) {
        try {
          const parsedDeliveries = JSON.parse(storedDeliveries);
          if (Array.isArray(parsedDeliveries) && parsedDeliveries.every(d => 'id' in d && 'providerName' in d && 'date' in d && 'quantity' in d)) {
            setDeliveries(parsedDeliveries);
          } else {
            console.warn("Invalid data structure in localStorage for deliveries, clearing.");
            localStorage.removeItem(DELIVERIES_STORAGE_KEY);
          }
        } catch (error) {
          console.error("Failed to parse deliveries from localStorage", error);
          localStorage.removeItem(DELIVERIES_STORAGE_KEY);
        }
      }

      // Load Providers
      const storedProviders = localStorage.getItem(PROVIDERS_STORAGE_KEY);
      if (storedProviders) {
        try {
          const parsedProviders = JSON.parse(storedProviders);
           if (Array.isArray(parsedProviders) && parsedProviders.every(p => 'id' in p && 'name' in p && 'address' in p && 'phone' in p)) {
            setProviders(parsedProviders);
          } else {
            console.warn("Invalid data structure in localStorage for providers, clearing providers list.");
            localStorage.removeItem(PROVIDERS_STORAGE_KEY);
            setProviders([]); 
          }
        } catch (error) {
          console.error("Failed to parse providers from localStorage", error);
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

      const newVendorTotalsMap: Record<string, number> = {};
      deliveries.forEach(delivery => {
        newVendorTotalsMap[delivery.providerName] = (newVendorTotalsMap[delivery.providerName] || 0) + delivery.quantity;
      });
      const newVendorTotalsArray = Object.entries(newVendorTotalsMap)
        .map(([name, total]) => ({ originalName: name, totalQuantity: total }))
        .sort((a, b) => a.originalName.localeCompare(b.originalName));
      setVendorTotals(newVendorTotalsArray);
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
  
  // handleDeleteDelivery y confirmDeleteDelivery ya no son necesarios

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow grid md:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-1 space-y-6">
            <Skeleton className="h-96 w-full rounded-lg" /> {/* Form Placeholder */}
          </div>
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-[600px] w-full rounded-lg" /> {/* Data View Placeholder */}
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
        <div className="w-0 sm:w-auto"></div> {/* Spacer for alignment */}
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
            vendorTotals={vendorTotals}
            // onDeleteDelivery ya no se pasa
            providers={providers} 
          />
        </div>
      </main>
      
      {/* AlertDialog para confirmación de borrado eliminado */}

      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

