
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Delivery, Delivery as DeliveryType, VendorTotal, Provider } from '@/types'; // Delivery alias for clarity if needed elsewhere
import SupplyEntryForm from '@/components/supply-entry-form';
import SupplyDataView from '@/components/supply-data-view';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardList, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';

const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PROVIDERS_STORAGE_KEY = 'dailySupplyTrackerProviders';

export default function RegistryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  const [vendorTotals, setVendorTotals] = useState<VendorTotal[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const [deliveryToDelete, setDeliveryToDelete] = useState<DeliveryType | null>(null);


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
            setProviders([]); // Set to empty array if data is invalid
          }
        } catch (error) {
          console.error("Failed to parse providers from localStorage", error);
          localStorage.removeItem(PROVIDERS_STORAGE_KEY);
          setProviders([]); // Set to empty array on error
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

  const handleAddDelivery = useCallback((newDeliveryData: Omit<DeliveryType, 'id'>) => {
    const newDelivery: DeliveryType = {
      ...newDeliveryData,
      id: crypto.randomUUID(),
    };
    setDeliveries(prev => [newDelivery, ...prev]);
    toast({
      title: "Entrega Registrada",
      description: `Entrega de ${newDelivery.providerName} el ${newDelivery.date} por ${newDelivery.quantity} unidades ha sido registrada.`,
    });
  }, [toast]);

  const handleDeleteDelivery = useCallback((id: string) => {
     const delivery = deliveries.find(d => d.id === id);
     if (delivery) {
        setDeliveryToDelete(delivery);
     }
  }, [deliveries]);

  const confirmDeleteDelivery = () => {
    if (deliveryToDelete) {
      setDeliveries(prev => prev.filter(d => d.id !== deliveryToDelete.id));
      toast({
        title: "Entrega Eliminada",
        description: `La entrega de ${deliveryToDelete.providerName} ha sido eliminada.`,
        variant: "destructive",
      });
      setDeliveryToDelete(null);
    }
  };

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
            <SupplyEntryForm onAddDelivery={handleAddDelivery} providers={providers} />
          )}
        </div>
        <div className="md:col-span-2 space-y-6">
          <SupplyDataView
            deliveries={deliveries}
            dailyTotals={dailyTotals}
            vendorTotals={vendorTotals}
            onDeleteDelivery={handleDeleteDelivery}
          />
        </div>
      </main>
      
      <AlertDialog open={!!deliveryToDelete} onOpenChange={(open) => { if (!open) setDeliveryToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que quieres eliminar esta entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de entrega de "{deliveryToDelete?.providerName}" del {deliveryToDelete?.date}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeliveryToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDelivery} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
