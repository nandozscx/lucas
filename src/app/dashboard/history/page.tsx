"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, History, ChevronLeft, ChevronRight, ShoppingBag, Users as UsersIcon, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption
} from "@/components/ui/table";
import { format, parseISO, getDay, startOfWeek, endOfWeek, isWithinInterval, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Delivery, Provider } from '@/types';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}


const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PROVIDERS_STORAGE_KEY = 'dailySupplyTrackerProviders';

export default function HistoryPage() {
  const [isClient, setIsClient] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0, locale: es }));
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedDeliveries = localStorage.getItem(DELIVERIES_STORAGE_KEY);
      if (storedDeliveries) {
        try {
          const parsedDeliveries = JSON.parse(storedDeliveries);
          if (Array.isArray(parsedDeliveries)) setDeliveries(parsedDeliveries);
        } catch (error) { console.error("Error parsing deliveries from localStorage", error); }
      }

      const storedProviders = localStorage.getItem(PROVIDERS_STORAGE_KEY);
      if (storedProviders) {
        try {
          const parsedProviders = JSON.parse(storedProviders);
          if (Array.isArray(parsedProviders)) setProviders(parsedProviders);
        } catch (error) { console.error("Error parsing providers from localStorage", error); }
      }
    }
  }, []);
  
  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subDays(prev, 7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0, locale: es });

  const deliveriesForCurrentWeek = deliveries.filter(d => {
    const deliveryDate = parseISO(d.date);
    return isWithinInterval(deliveryDate, { start: currentWeekStart, end: currentWeekEnd });
  });

  const weeklyTableData = providers.map(provider => {
    const row: { providerName: string; quantities: (number | undefined)[] } = {
      providerName: provider.name,
      quantities: Array(7).fill(undefined), // Sunday to Saturday
    };
    deliveriesForCurrentWeek
      .filter(d => d.providerName === provider.name)
      .forEach(delivery => {
        const deliveryDate = parseISO(delivery.date);
        const dayIndex = getDay(deliveryDate); // 0 for Sunday ... 6 for Saturday
        row.quantities[dayIndex] = (row.quantities[dayIndex] || 0) + delivery.quantity;
      });
    return row;
  });

  const daysOfWeekHeaders = Array.from({ length: 7 }).map((_, i) => 
    format(addDays(currentWeekStart, i), "EEEE", { locale: es })
  );

  const exportHistoryToPDF = () => {
    if (weeklyTableData.every(row => row.quantities.every(q => q === undefined)) && deliveriesForCurrentWeek.length === 0) {
      toast({
        title: "Sin Datos",
        description: "No hay datos en la semana actual para exportar a PDF.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF() as jsPDFWithAutoTable;
    const tableHeaders = ['Proveedor', ...daysOfWeekHeaders.map(d => d.charAt(0).toUpperCase() + d.slice(1))];
    const tableBody = weeklyTableData.map(row => [
      row.providerName,
      ...row.quantities.map(q => (q !== undefined ? q.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : "-"))
    ]);
    
    const weekTitle = `Semana del ${format(currentWeekStart, "dd 'de' MMMM", { locale: es })} al ${format(currentWeekEnd, "dd 'de' MMMM 'de' yyyy", { locale: es })}`;

    doc.setFontSize(18);
    doc.text('Historial de Entregas Semanales', 14, 15);
    doc.setFontSize(12);
    doc.text(weekTitle, 14, 22);

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 28,
    });

    doc.save(`historial_semanal_${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
    toast({
      title: "Exportación PDF Exitosa",
      description: "El historial semanal se ha exportado a PDF.",
    });
  };

  const EmptyState: React.FC<{ message: string; icon?: React.ElementType }> = ({ message, icon: Icon = History }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md min-h-[300px]">
      <Icon className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Hay Datos Disponibles</p>
      <p className="text-sm">{message}</p>
    </div>
  );


  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow space-y-6">
          <Skeleton className="h-12 w-full rounded-lg" /> {/* Week navigation placeholder */}
          <Skeleton className="h-96 w-full rounded-lg" /> {/* Table placeholder */}
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
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          <History className="mr-3 h-8 w-8" /> Historial de Entregas Semanales
        </h1>
        <div className="w-0 sm:w-auto"></div> {/* Spacer for alignment */}
      </header>

      <main className="flex-grow">
        <Card className="w-full shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <CardTitle className="text-xl text-center sm:text-left">
                {format(currentWeekStart, "dd 'de' MMMM", { locale: es })} - {format(currentWeekEnd, "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handlePreviousWeek}>
                  <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Semana Anterior</span>
                  <span className="sm:hidden">Ant.</span>
                </Button>
                <Button variant="outline" onClick={handleNextWeek}>
                  <span className="hidden sm:inline">Semana Siguiente</span>
                  <span className="sm:hidden">Sig.</span>
                  <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
                </Button>
                 <Button onClick={exportHistoryToPDF} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Exportar PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {providers.length === 0 ? (
              <EmptyState message="No hay proveedores registrados. Agregue proveedores para ver el historial." icon={UsersIcon}/>
            ) : weeklyTableData.every(row => row.quantities.every(q => q === undefined)) && deliveriesForCurrentWeek.length === 0 ? (
               <EmptyState message="No hay entregas registradas para esta semana." icon={ShoppingBag}/>
            ) : (
              <ScrollArea className="h-auto max-h-[calc(100vh-350px)] sm:max-h-[calc(100vh-320px)] rounded-md border whitespace-nowrap">
                <Table>
                  {(weeklyTableData.length > 8 || daysOfWeekHeaders.length > 5) && <TableCaption>Desplázate para ver más proveedores o días.</TableCaption>}
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="font-semibold sticky left-0 bg-card z-10 min-w-[150px] pl-4">Proveedor</TableHead>
                      {daysOfWeekHeaders.map((day, index) => (
                        <TableHead 
                          key={day} 
                          className={`text-right font-semibold min-w-[100px] capitalize ${index === daysOfWeekHeaders.length - 1 ? 'pr-4' : ''}`}
                        >
                          {day}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyTableData.map((row) => (
                      <TableRow key={row.providerName}>
                        <TableCell className="font-medium sticky left-0 bg-card z-10 pl-4">{row.providerName}</TableCell>
                        {row.quantities.map((quantity, index) => (
                          <TableCell 
                            key={index} 
                            className={`text-right ${index === row.quantities.length - 1 ? 'pr-4' : ''}`}
                          >
                            {quantity !== undefined ? quantity.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
      
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
