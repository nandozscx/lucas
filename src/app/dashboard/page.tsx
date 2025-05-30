
"use client";

import React, { useState, useEffect } from 'react';
import type { Delivery } from '@/types'; // VendorTotal might be unneeded if not used
import DashboardHeader from '@/components/dashboard-header';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ClipboardPenLine, Users, Download, History } from 'lucide-react';

// Simple client-side ID generator (kept in case "Registro" needs it later)
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
        if (Array.isArray(parsedDeliveries) && parsedDeliveries.every(d => 'id' in d && 'providerName' in d && 'date' in d && 'quantity' in d)) {
            setDeliveries(parsedDeliveries);
        } else {
            console.warn("Invalid data structure in localStorage, clearing.");
            localStorage.removeItem('dailySupplyTrackerDeliveries');
        }
      } catch (error) {
        console.error("Failed to parse deliveries from localStorage", error);
        localStorage.removeItem('dailySupplyTrackerDeliveries');
      }
    }
  }, []);

  // Save deliveries to localStorage whenever they change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('dailySupplyTrackerDeliveries', JSON.stringify(deliveries));
    }
  }, [deliveries, isClient]);

  // Moved exportToCSV function from DashboardHeader
  const exportToCSV = () => {
    if (deliveries.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = "Provider,Date,Quantity\n";
    const csvRows = deliveries.map(d =>
      `"${d.providerName.replace(/"/g, '""')}","${d.date}",${d.quantity}`
    );
    const csvContent = headers + csvRows.join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "supply_deliveries.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: "Deliveries exported to CSV.",
      });
    } else {
       toast({
        title: "Export Failed",
        description: "Your browser does not support direct downloads.",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = (cardTitle: string) => {
    // Placeholder for navigation or other actions
    toast({
      title: `${cardTitle} Clicked`,
      description: `You clicked the ${cardTitle} card. Navigation not yet implemented.`,
    });
    console.log(`${cardTitle} card action triggered.`);
  };


  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 bg-background">
        <Skeleton className="h-20 w-full rounded-lg" /> {/* Header Placeholder */}
        <main className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 p-4 md:p-8">
            <Skeleton className="h-48 w-full rounded-lg aspect-square" />
            <Skeleton className="h-48 w-full rounded-lg aspect-square" />
            <Skeleton className="h-48 w-full rounded-lg aspect-square" />
            <Skeleton className="h-48 w-full rounded-lg aspect-square" />
        </main>
        <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
            <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </footer>
      </div>
    );
  }

  const cardItems = [
    { title: "Registro", icon: ClipboardPenLine, action: () => handleCardClick("Registro") },
    { title: "Proveedores", icon: Users, action: () => handleCardClick("Proveedores") },
    { title: "Exportar", icon: Download, action: exportToCSV },
    { title: "Historial", icon: History, action: () => handleCardClick("Historial") },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 bg-background">
      <DashboardHeader onExportCSV={exportToCSV} />
      <main className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 p-4 md:p-8 items-center">
        {cardItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card
              key={item.title}
              role="button"
              tabIndex={0}
              onClick={item.action}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); } }}
              className="flex flex-col items-center justify-center p-6 hover:shadow-xl transition-all duration-200 ease-in-out cursor-pointer aspect-square rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-md"
              aria-label={item.title}
            >
              <IconComponent className="h-16 w-16 text-primary mb-4" strokeWidth={1.5} />
              <p className="text-xl font-semibold text-center text-foreground">{item.title}</p>
            </Card>
          );
        })}
      </main>
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. All rights reserved.</p>
      </footer>
    </div>
  );
}
