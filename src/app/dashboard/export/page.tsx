
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, File, Sheet, FileSpreadsheet, FileText as FileTextIcon } from 'lucide-react'; // Changed FileCsv to File
import { useToast } from "@/hooks/use-toast";
import type { Delivery } from '@/types';

export default function ExportPage() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const exportToCSV = () => {
    const storedDeliveriesData = localStorage.getItem('dailySupplyTrackerDeliveries');
    const currentDeliveries: Delivery[] = storedDeliveriesData ? JSON.parse(storedDeliveriesData) : [];

    if (currentDeliveries.length === 0) {
      toast({
        title: "Sin Datos",
        description: "No hay datos para exportar a CSV.",
        variant: "destructive",
      });
      return;
    }

    const headers = "Proveedor,Fecha,Cantidad\n";
    const csvRows = currentDeliveries.map((d: Delivery) =>
      `"${d.providerName.replace(/"/g, '""')}","${d.date}",${d.quantity}`
    );
    const csvContent = headers + csvRows.join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "entregas_suministros.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Exportación CSV Exitosa",
        description: "Las entregas se han exportado a CSV.",
      });
    } else {
       toast({
        title: "Exportación CSV Fallida",
        description: "Tu navegador no soporta descargas directas.",
        variant: "destructive",
      });
    }
  };

  const handleExportOptionClick = (format: 'csv' | 'sheets' | 'excel' | 'pdf') => {
    if (format === 'csv') {
      exportToCSV();
    } else {
      toast({
        title: "Próximamente",
        description: `La exportación a ${format.toUpperCase()} aún no está implementada.`,
      });
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 p-4 md:p-8 items-center">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="w-full rounded-lg aspect-square" />
          ))}
        </main>
        <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
          <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </footer>
      </div>
    );
  }

  const exportOptions = [
    { title: "Exportar a CSV", icon: File, action: () => handleExportOptionClick('csv') }, // Changed FileCsv to File
    { title: "Exportar a Google Sheets", icon: Sheet, action: () => handleExportOptionClick('sheets') },
    { title: "Exportar a Excel", icon: FileSpreadsheet, action: () => handleExportOptionClick('excel') },
    { title: "Exportar a PDF", icon: FileTextIcon, action: () => handleExportOptionClick('pdf') },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg gap-4">
        <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al Panel
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          Opciones de Exportación
        </h1>
        <div className="w-0 sm:w-auto"></div> {/* Spacer for alignment */}
      </header>

      <main className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 p-4 md:p-8 items-center">
        {exportOptions.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card
              key={item.title}
              role="button"
              tabIndex={0}
              onClick={item.action}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); } }}
              className="flex flex-col items-center justify-center p-4 hover:shadow-xl transition-all duration-200 ease-in-out cursor-pointer aspect-square rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-md"
              aria-label={item.title}
            >
              <IconComponent className="h-20 w-20 text-primary mb-3" strokeWidth={1.5} />
              <p className="text-lg font-semibold text-center text-foreground">{item.title}</p>
            </Card>
          );
        })}
      </main>
      
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
