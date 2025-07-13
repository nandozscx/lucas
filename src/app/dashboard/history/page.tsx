
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, History, ChevronLeft, ChevronRight, ShoppingBag, Users as UsersIcon, Download, CalendarDays, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { format, parseISO, getDay, startOfWeek, endOfWeek, isWithinInterval, addDays, subDays, nextSaturday, previousFriday } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Delivery, Provider } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { capitalize } from '@/lib/utils';
import type jsPDF from 'jspdf';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}


const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PROVIDERS_STORAGE_KEY = 'dailySupplyTrackerProviders';

export default function HistoryPage() {
  const [isClient, setIsClient] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);
  const [currentYear, setCurrentYear] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadData = () => {
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
    };

    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0, locale: es }));
    if (typeof window !== 'undefined') {
      loadData();
      window.addEventListener('storage-update', loadData);
    }
    
    return () => {
        if(typeof window !== 'undefined') {
            window.removeEventListener('storage-update', loadData);
        }
    }
  }, []);
  
  const handlePreviousWeek = () => {
    if (currentWeekStart) {
      setCurrentWeekStart(prev => subDays(prev!, 7));
    }
  };

  const handleNextWeek = () => {
    if (currentWeekStart) {
      setCurrentWeekStart(prev => addDays(prev!, 7));
    }
  };
  
  // Data for "Totales por Proveedor" - Moved up to respect Rules of Hooks
  const vendorTotalsForWeek = useMemo(() => {
    if (!currentWeekStart) return [];

    // Standard week (e.g., Sunday to Saturday)
    const standardWeekStart = startOfWeek(currentWeekStart, { weekStartsOn: 0 });
    const standardWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });

    // Lucio's week (Saturday to Friday)
    const lucioWeekStart = startOfWeek(currentWeekStart, { weekStartsOn: 6 });
    const lucioWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 6 });

    return providers.map(provider => {
        const isLucio = provider.name.toLowerCase() === 'lucio';
        const weekInterval = isLucio
            ? { start: lucioWeekStart, end: lucioWeekEnd }
            : { start: standardWeekStart, end: standardWeekEnd };
            
        const deliveriesForProviderInCycle = deliveries.filter(d => {
            if (d.providerName !== provider.name) return false;
            const deliveryDate = parseISO(d.date);
            return isWithinInterval(deliveryDate, weekInterval);
        });

        const totalQuantity = deliveriesForProviderInCycle.reduce((sum, d) => sum + d.quantity, 0);

        return {
            providerName: provider.name,
            totalQuantity,
            price: provider.price,
            totalToPay: totalQuantity * provider.price,
        };
    }).filter(v => v.totalQuantity > 0);
  }, [providers, deliveries, currentWeekStart]);

  if (!isClient || !currentWeekStart) {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
        <header className="flex items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow space-y-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </main>
        <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
          <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </footer>
      </div>
    );
  }

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0, locale: es });
  const weekTitle = `Semana del ${format(currentWeekStart, "dd/MM/yy")} al ${format(currentWeekEnd, "dd/MM/yy")}`;

  const deliveriesForCurrentWeek = deliveries.filter(d => {
    const deliveryDate = parseISO(d.date);
    return isWithinInterval(deliveryDate, { start: currentWeekStart, end: currentWeekEnd });
  });

  const daysOfWeekHeaders = Array.from({ length: 7 }).map((_, i) => 
    capitalize(format(addDays(currentWeekStart, i), "EEEE", { locale: es }))
  );
  
  // Data for "Resumen Semanal"
  const weeklySummaryData = providers.map(provider => {
    const quantities: (number | undefined)[] = Array(7).fill(undefined);
    deliveriesForCurrentWeek
      .filter(d => d.providerName === provider.name)
      .forEach(delivery => {
        const deliveryDate = parseISO(delivery.date);
        const dayIndex = getDay(deliveryDate); // 0 for Sunday ... 6 for Saturday
        quantities[dayIndex] = (quantities[dayIndex] || 0) + delivery.quantity;
      });
    return { providerName: provider.name, quantities: quantities };
  });

  // Data for "Totales Diarios"
  const dailyTotalsForWeek = daysOfWeekHeaders.map((day, i) => {
    const date = addDays(currentWeekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const total = deliveriesForCurrentWeek
      .filter(d => d.date === dateStr)
      .reduce((sum, d) => sum + d.quantity, 0);
    return { date, total };
  }).filter(d => d.total > 0);

  const grandTotalToPay = vendorTotalsForWeek.reduce((sum, row) => sum + row.totalToPay, 0);

  // PDF Export functions
  const exportWeeklySummaryToPDF = async () => {
    if (weeklySummaryData.every(row => row.quantities.every(q => q === undefined))) {
      toast({ title: "Sin Datos", description: "No hay datos en la semana actual para exportar.", variant: "destructive" });
      return;
    }
    const { default: jsPDFConstructor } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new (jsPDFConstructor as any)() as jsPDFWithAutoTable;
    const tableHeaders = ['Proveedor', ...daysOfWeekHeaders.map(d => d.charAt(0).toUpperCase() + d.slice(1))];
    const tableBody = weeklySummaryData.map(row => [
      row.providerName,
      ...row.quantities.map(q => (q !== undefined ? q.toLocaleString() : "-")),
    ]);
    doc.setFontSize(18);
    doc.text('Resumen Semanal de Entregas', 14, 15);
    doc.setFontSize(12);
    doc.text(weekTitle, 14, 22);
    doc.autoTable({ head: [tableHeaders], body: tableBody, startY: 28, headStyles: { halign: 'center' }, columnStyles: { 0: { halign: 'left' } } });
    doc.save(`resumen_semanal_${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
    toast({ title: "Exportación PDF Exitosa", description: "El resumen semanal se ha exportado a PDF." });
  };
  
  const exportDailyTotalsToPDF = async () => {
    if (dailyTotalsForWeek.length === 0) {
      toast({ title: "Sin Datos", description: "No hay totales diarios en la semana actual para exportar.", variant: "destructive" });
      return;
    }
    const { default: jsPDFConstructor } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new (jsPDFConstructor as any)() as jsPDFWithAutoTable;
    const tableHeaders = ['Fecha', 'Cantidad Total'];
    const tableBody = dailyTotalsForWeek.map(day => [
      capitalize(format(day.date, "EEEE, dd/MM", { locale: es })),
      day.total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})
    ]);
    doc.setFontSize(18);
    doc.text('Totales Diarios de Entregas', 14, 15);
    doc.setFontSize(12);
    doc.text(weekTitle, 14, 22);
    doc.autoTable({ head: [tableHeaders], body: tableBody, startY: 28 });
    doc.save(`totales_diarios_${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
    toast({ title: "Exportación PDF Exitosa", description: "Los totales diarios se han exportado a PDF." });
  };

  const exportVendorTotalsToPDF = async () => {
    if (vendorTotalsForWeek.length === 0) {
      toast({ title: "Sin Datos", description: "No hay totales de proveedor en la semana actual para exportar.", variant: "destructive" });
      return;
    }
    const { default: jsPDFConstructor } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new (jsPDFConstructor as any)() as jsPDFWithAutoTable;
    const tableHeaders = ['Proveedor', 'Cantidad Total', 'Precio Unit.', 'Total a Pagar'];
    const tableBody = vendorTotalsForWeek.map(v => [
        v.providerName,
        v.totalQuantity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}),
        `S/. ${v.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        `S/. ${v.totalToPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
    ]);
    doc.setFontSize(18);
    doc.text('Totales por Proveedor', 14, 15);
    doc.setFontSize(12);
    doc.text(weekTitle, 14, 22);
    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 28,
      foot: [['', '', 'Total General:', `S/. ${grandTotalToPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]],
      footStyles: { fontStyle: 'bold', halign: 'right' },
      columnStyles: { 3: { halign: 'right' } }
    });
    doc.save(`totales_proveedor_${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
    toast({ title: "Exportación PDF Exitosa", description: "Los totales por proveedor se han exportado a PDF." });
  };

  const EmptyState: React.FC<{ message: string; icon?: React.ElementType }> = ({ message, icon: Icon = History }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md min-h-[300px]">
      <Icon className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Hay Datos Disponibles</p>
      <p className="text-sm">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg gap-4">
        <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al Panel
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          <History className="mr-3 h-8 w-8" /> Historial de Entregas
        </h1>
        <div className="w-0 sm:w-auto"></div>
      </header>

      <main className="flex-grow flex flex-col">
        <Card className="w-full shadow-xl flex flex-col flex-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <CardTitle className="text-xl">Historial Semanal</CardTitle>
                <CardDescription>{weekTitle}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handlePreviousWeek}>
                  <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Semana Ant.</span>
                  <span className="sm:hidden">Ant.</span>
                </Button>
                <Button variant="outline" onClick={handleNextWeek}>
                  <span className="hidden sm:inline">Semana Sig.</span>
                  <span className="sm:hidden">Sig.</span>
                  <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <Tabs defaultValue="vendorTotals" className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 mb-4">
                  <TabsTrigger value="vendorTotals" className="flex items-center gap-2 text-sm sm:text-base">
                      <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5"/> Totales por Proveedor
                  </TabsTrigger>
                  <TabsTrigger value="weeklySummary" className="flex items-center gap-2 text-sm sm:text-base">
                      <CalendarRange className="h-4 w-4 sm:h-5 sm:w-5"/> Resumen Semanal
                  </TabsTrigger>
                  <TabsTrigger value="dailyTotals" className="flex items-center gap-2 text-sm sm:text-base">
                      <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5"/> Totales Diarios
                  </TabsTrigger>
              </TabsList>
              
              {/* Totales por Proveedor Tab */}
              <TabsContent value="vendorTotals">
                  <div className="flex justify-end mb-4">
                      <Button onClick={exportVendorTotalsToPDF} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={vendorTotalsForWeek.length === 0}>
                          <Download className="mr-2 h-4 w-4" /> Exportar PDF
                      </Button>
                  </div>
                  {providers.length === 0 ? <EmptyState message="No hay proveedores registrados." icon={UsersIcon}/> :
                  vendorTotalsForWeek.length === 0 ? <EmptyState message="No hay entregas registradas para esta semana." icon={ShoppingBag}/> :
                  (
                      <ScrollArea className="max-h-[400px] rounded-md border whitespace-nowrap">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="font-semibold">Proveedor</TableHead>
                                      <TableHead className="text-right font-semibold">Cantidad Total</TableHead>
                                      <TableHead className="text-right font-semibold">Precio Unit.</TableHead>
                                      <TableHead className="text-right font-semibold">Total a Pagar</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {vendorTotalsForWeek.map((vendor) => (
                                      <TableRow key={vendor.providerName}>
                                          <TableCell className="font-medium">{vendor.providerName}</TableCell>
                                          <TableCell className="text-right">{vendor.totalQuantity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                          <TableCell className="text-right">S/. {vendor.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                          <TableCell className="text-right font-semibold">S/. {vendor.totalToPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                              <TableFooter>
                                  <TableRow>
                                      <TableCell colSpan={3} className="text-right font-bold text-lg">Total General:</TableCell>
                                      <TableCell className="text-right font-bold text-lg">S/. {grandTotalToPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                  </TableRow>
                              </TableFooter>
                          </Table>
                          <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                  )}
              </TabsContent>

              {/* Resumen Semanal Tab */}
              <TabsContent value="weeklySummary">
                  <div className="flex justify-end mb-4">
                      <Button onClick={exportWeeklySummaryToPDF} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={weeklySummaryData.every(row => row.quantities.every(q => q === undefined))}>
                          <Download className="mr-2 h-4 w-4" /> Exportar PDF
                      </Button>
                  </div>
                  {providers.length === 0 ? <EmptyState message="No hay proveedores registrados." icon={UsersIcon}/> :
                  weeklySummaryData.every(row => row.quantities.every(q => q === undefined)) ? <EmptyState message="No hay entregas registradas para esta semana." icon={ShoppingBag}/> :
                  (
                      <ScrollArea className="max-h-[400px] rounded-md border whitespace-nowrap">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="font-semibold sticky left-0 bg-card z-10 min-w-[150px]">Proveedor</TableHead>
                                      {daysOfWeekHeaders.map((day) => <TableHead key={day} className="text-right font-semibold min-w-[100px] capitalize">{day}</TableHead>)}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {weeklySummaryData.map((row) => (
                                      <TableRow key={row.providerName}>
                                          <TableCell className="font-medium sticky left-0 bg-card z-10">{row.providerName}</TableCell>
                                          {row.quantities.map((quantity, index) => <TableCell key={index} className="text-right">{quantity !== undefined ? quantity.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : "-"}</TableCell>)}
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                          <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                  )}
              </TabsContent>

              {/* Totales Diarios Tab */}
              <TabsContent value="dailyTotals">
                  <div className="flex justify-end mb-4">
                      <Button onClick={exportDailyTotalsToPDF} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={dailyTotalsForWeek.length === 0}>
                          <Download className="mr-2 h-4 w-4" /> Exportar PDF
                      </Button>
                  </div>
                  {dailyTotalsForWeek.length === 0 ? <EmptyState message="No hay entregas con totales para esta semana." icon={CalendarDays}/> :
                  (
                      <ScrollArea className="max-h-[400px] rounded-md border">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="font-semibold">Fecha</TableHead>
                                      <TableHead className="text-right font-semibold">Cantidad Total</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {dailyTotalsForWeek.map(({date, total}) => (
                                      <TableRow key={date.toString()}>
                                          <TableCell className="font-medium">{capitalize(format(date, "EEEE, dd/MM", { locale: es }))}</TableCell>
                                          <TableCell className="text-right">{total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </ScrollArea>
                  )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {currentYear} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
