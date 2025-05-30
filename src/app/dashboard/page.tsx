
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Delivery, VendorTotal } from '@/types';
import DashboardHeader from '@/components/dashboard-header';
import SupplyEntryForm from '@/components/supply-entry-form';
import SupplyDataView from '@/components/supply-data-view';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Simple client-side ID generator
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export default function DashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  // Load deliveries from localStorage on component mount
  useEffect(() => {
    setIsClient(true);
    const storedDeliveries = localStorage.getItem('dailySupplyTrackerDeliveries');
    if (storedDeliveries) {
      try {
        const parsedDeliveries = JSON.parse(storedDeliveries);
        // Basic validation for stored data
        if (Array.isArray(parsedDeliveries) && parsedDeliveries.every(d => 'id' in d && 'providerName' in d && 'date' in d && 'quantity' in d)) {
            setDeliveries(parsedDeliveries);
        } else {
            localStorage.removeItem('dailySupplyTrackerDeliveries'); // Clear corrupted data
        }
      } catch (error) {
        console.error("Failed to parse deliveries from localStorage", error);
        localStorage.removeItem('dailySupplyTrackerDeliveries'); // Clear corrupted data
      }
    }
  }, []);

  // Save deliveries to localStorage whenever they change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('dailySupplyTrackerDeliveries', JSON.stringify(deliveries));
    }
  }, [deliveries, isClient]);

  const handleAddDelivery = (newDeliveryData: Omit<Delivery, 'id'>) => {
    const newDelivery: Delivery = {
      ...newDeliveryData,
      id: generateId(),
    };
    setDeliveries(prevDeliveries => [...prevDeliveries, newDelivery]);
    toast({
      title: "Success!",
      description: `Delivery from ${newDelivery.providerName} added.`,
      className: "bg-primary text-primary-foreground",
    });
  };

  const handleDeleteDelivery = (id: string) => {
    setDeliveries(prevDeliveries => prevDeliveries.filter(d => d.id !== id));
    toast({
      title: "Delivery Deleted",
      description: "The delivery record has been removed.",
      variant: "destructive",
    });
  };

  const dailyTotals = useMemo(() => {
    if (!isClient) return {};
    return deliveries.reduce((acc, delivery) => {
      acc[delivery.date] = (acc[delivery.date] || 0) + delivery.quantity;
      return acc;
    }, {} as Record<string, number>);
  }, [deliveries, isClient]);

  const vendorTotals = useMemo<VendorTotal[]>(() => {
    if (!isClient) return [];
    const totalsMap: Record<string, { originalName: string; totalQuantity: number }> = {};
    deliveries.forEach(delivery => {
      const normalizedName = delivery.providerName.trim().toLowerCase();
      if (totalsMap[normalizedName]) {
        totalsMap[normalizedName].totalQuantity += delivery.quantity;
      } else {
        totalsMap[normalizedName] = {
          originalName: delivery.providerName.trim(),
          totalQuantity: delivery.quantity,
        };
      }
    });
    return Object.values(totalsMap).sort((a, b) => a.originalName.localeCompare(b.originalName));
  }, [deliveries, isClient]);

  if (!isClient) {
    // Skeleton loader to match the layout during SSR/hydration
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 bg-background">
        <Skeleton className="h-20 w-full rounded-lg" /> {/* Header Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-[450px] w-full rounded-lg" /> {/* Form Placeholder */}
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[600px] w-full rounded-lg" /> {/* Data View Placeholder */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 bg-background">
      <DashboardHeader deliveries={deliveries} />
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        <section aria-labelledby="add-delivery-heading" className="lg:col-span-1">
           <h2 id="add-delivery-heading" className="sr-only">Add New Delivery Form</h2>
          <SupplyEntryForm onAddDelivery={handleAddDelivery} />
        </section>
        <section aria-labelledby="supply-records-heading" className="lg:col-span-2">
          <h2 id="supply-records-heading" className="sr-only">Supply Records and Totals</h2>
          <SupplyDataView
            deliveries={deliveries}
            dailyTotals={dailyTotals}
            vendorTotals={vendorTotals}
            onDeleteDelivery={handleDeleteDelivery}
          />
        </section>
      </main>
      <footer className="text-center text-sm text-muted-foreground py-4">
        <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. All rights reserved.</p>
      </footer>
    </div>
  );
}
