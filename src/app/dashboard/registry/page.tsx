
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Delivery, Delivery as DeliveryType, VendorTotal } from '@/types'; // Delivery alias for clarity if needed elsewhere
import SupplyEntryForm from '@/components/supply-entry-form';
import SupplyDataView from '@/components/supply-data-view';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardList } from 'lucide-react';
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

const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';

export default function RegistryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryType[]>([]);
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  const [vendorTotals, setVendorTotals] = useState<VendorTotal[]>([]);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const [deliveryToDelete, setDeliveryToDelete] = useState<DeliveryType | null>(null);


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
            console.warn("Invalid data structure in localStorage for deliveries, clearing.");
            localStorage.removeItem(DELIVERIES_STORAGE_KEY);
          }
        } catch (error) {
          console.error("Failed to parse deliveries from localStorage", error);
          localStorage.removeItem(DELIVERIES_STORAGE_KEY);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(deliveries));

      // Calculate daily totals
      const newDailyTotals: Record<string, number> = {};
      deliveries.forEach(delivery => {
        newDailyTotals[delivery.date] = (newDailyTotals[delivery.date] || 0) + delivery.quantity;
      });
      setDailyTotals(newDailyTotals);

      // Calculate vendor totals
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
      title: "Delivery Added",
      description: `Delivery from ${newDelivery.providerName} on ${newDelivery.date} for ${newDelivery.quantity} units has been recorded.`,
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
        title: "Delivery Deleted",
        description: `Delivery from ${deliveryToDelete.providerName} has been deleted.`,
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
          Back to Dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          <ClipboardList className="mr-3 h-8 w-8" /> Register Supply Deliveries
        </h1>
        <div className="w-0 sm:w-auto"></div> {/* Spacer for alignment */}
      </header>

      <main className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="md:col-span-1 space-y-6">
          <SupplyEntryForm onAddDelivery={handleAddDelivery} />
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
            <AlertDialogTitle>Are you sure you want to delete this delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the delivery record from "{deliveryToDelete?.providerName}" on {deliveryToDelete?.date}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeliveryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDelivery} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. All rights reserved.</p>
      </footer>
    </div>
  );
}
