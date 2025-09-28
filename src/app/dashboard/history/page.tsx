
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, History as HistoryIcon, Users, CalendarDays, CalendarRange, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter, TableCaption } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import type { Delivery, Provider } from '@/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, subDays, addDays, isWithinInterval, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { capitalize } from '@/lib/utils';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const STORAGE_KEYS = {
  deliveries: 'dailySupplyTrackerDeliveries',
  providers: 'dailySupplyTrackerProviders',
};

export default function HistoryPage() {
  const [isClient, setIsClient] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(subDays(new Date(), 7), { weekStartsOn: 0 }));
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const { toast } = useToast();
  
  const loadData = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedDeliveries = localStorage.getItem(STORAGE_KEYS.deliveries);
      const storedProviders = localStorage.getItem(STORAGE_KEYS.providers);
      if (storedDeliveries) setDeliveries(JSON.parse(storedDeliveries));
      if (storedProviders) setProviders(JSON.parse(storedProviders));
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    loadData();
    window.addEventListener('storage-update', loadData);
    return () => window.removeEventListener('storage-update', loadData);
  }, [loadData]);

  const handlePreviousWeek = () => setCurrentWeekStart(prev => subDays(prev, 7));
  const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));

  const weekTitle = `Semana del ${format(currentWeekStart, "dd/MM/yy")} al ${format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "dd/MM/yy")}`;

  const {
    deliveriesForWeek,
    weeklyTableData,
    daysOfWeekHeaders,
    sortedDailyTotals,
    enrichedVendorTotals,
    grandTotalToPay,
  } = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
    const deliveriesForWeek = deliveries.filter(d => isWithinInterval(parseISO(d.date), { start: currentWeekStart, end: weekEnd }));
    
    // For Resumen Semanal
    const weeklyTableData = providers.map(provider => {
        const row: { providerName: string; quantities: (number | undefined)[] } = {
          providerName: provider.name,
          quantities: Array(7).fill(undefined), // Sunday to Saturday
        };
        deliveriesForWeek
          .filter(d => d.providerName === provider.name)
          .forEach(delivery => {
            const dayIndex = getDay(parseISO(delivery.date));
            row.quantities[dayIndex] = (row.quantities[dayIndex] || 0) + delivery.quantity;
          });
        return row;
    });

    const daysOfWeekHeaders = Array.from({ length: 7 }).map((_, i) => capitalize(format(addDays(currentWeekStart, i), "EEEE", { locale: es })));

    // For Totales Diarios
    const dailyTotals: Record<string, number> = {};
      deliveriesForWeek.forEach(delivery => {
        dailyTotals[delivery.date] = (dailyTotals[delivery.date] || 0) + delivery.quantity;
    });
    const sortedDailyTotals = Object.entries(dailyTotals).sort(([dateA], [dateB]) => parseISO(dateA).getTime() - parseISO(dateB).getTime());

    // For Totales por Proveedor
    const standardWeekStart = startOfWeek(currentWeekStart, { weekStartsOn: 0 });
    const standardWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
    const lucioWeekStart = startOfWeek(currentWeekStart, { weekStartsOn: 6 });
    const lucioWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 6 });

    const enrichedVendorTotals = providers.map(provider => {
        const isLucio = provider.name.toLowerCase() === 'lucio';
        const weekInterval = isLucio ? { start: lucioWeekStart, end: lucioWeekEnd } : { start: standardWeekStart, end: standardWeekEnd };
        
        const deliveriesForProviderInCycle = deliveries.filter(d => {
            if (d.providerName !== provider.name) return false;
            return isWithinInterval(parseISO(d.date), weekInterval);
        });

        const totalQuantity = deliveriesForProviderInCycle.reduce((sum, d) => sum + d.quantity, 0);
        return {
            name: provider.name,
            quantity: totalQuantity,
            price: provider.price,
            totalToPay: totalQuantity * provider.price,
        };
    }).filter(p => p.quantity > 0);

    const grandTotalToPay = enrichedVendorTotals.reduce((sum, p) => sum + p.totalToPay, 0);

    return { deliveriesForWeek, weeklyTableData, daysOfWeekHeaders, sortedDailyTotals, enrichedVendorTotals, grandTotalToPay };
  }, [currentWeekStart, deliveries, providers]);


  const exportToPDF = async (view: 'weekly' | 'daily' | 'provider') => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.setFontSize(18);
    doc.text('Reporte Histórico', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(weekTitle, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    let finalY = 28;

    if (view === 'weekly' && weeklyTableData.length > 0) {
      doc.autoTable({
        head: [['Proveedor', ...daysOfWeekHeaders]],
        body: weeklyTableData.map(row => [row.providerName, ...row.quantities.map(q => q?.toFixed(2) || '-')]),
        startY: finalY,
        headStyles: { fillColor: [63, 81, 181] },
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    } else if (view === 'daily' && sortedDailyTotals.length > 0) {
      doc.autoTable({
        head: [['Fecha', 'Cantidad Total']],
        body: sortedDailyTotals.map(([date, total]) => [capitalize(format(parseISO(date), 'EEEE, dd/MM', { locale: es })), total.toFixed(2)]),
        startY: finalY,
        headStyles: { fillColor: [0, 150, 136] },
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    } else if (view === 'provider' && enrichedVendorTotals.length > 0) {
      doc.autoTable({
        head: [['Proveedor', 'Cantidad', 'Precio', 'Total a Pagar']],
        body: enrichedVendorTotals.map(p => [p.name, p.quantity.toFixed(2), `S/. ${p.price.toFixed(2)}`, `S/. ${p.totalToPay.toFixed(2)}`]),
        startY: finalY,
        headStyles: { fillColor: [76, 175, 80] },
        foot: [['', '', 'Total General', `S/. ${grandTotalToPay.toFixed(2)}`]],
        footStyles: { fontStyle: 'bold', fillColor: [200, 230, 201], textColor: [0, 0, 0] }
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    } else {
        toast({ title: "Sin datos", description: "No hay datos para exportar en esta vista.", variant: "destructive"});
        return;
    }

    doc.save(`historial_${view}_${format(currentWeekStart, 'yyyy-MM-dd')}.pdf`);
    toast({ title: "Exportación Exitosa", description: `El reporte de ${view} se ha guardado.` });
  };
  
  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6 space-y-6 bg-background">
        <header className="flex items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
        </header>
        <main className="flex-grow">
            <Skeleton className="h-[600px] w-full"/>
        </main>
      </div>
    );
  }
  
  const EmptyState: React.FC<{ message: string; icon?: React.ElementType }> = ({ message, icon: Icon = ShoppingBag }) => (
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
          <HistoryIcon className="mr-3 h-8 w-8" />
          Historial de Entregas
        </h1>
        <div className="w-0 sm:w-auto"></div>
      </header>

      <main className="flex-grow flex justify-center items-start p-4">
        <Card className="w-full">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <CardTitle>Visor de Semanas Pasadas</CardTitle>
                        <CardDescription>{weekTitle}</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                            <ChevronLeft className="h-4 w-4" /> Semana Anterior
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleNextWeek}>
                            Semana Siguiente <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="providerTotals" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="weeklySummary"><CalendarRange className="mr-2 h-4 w-4"/> Resumen Semanal</TabsTrigger>
                        <TabsTrigger value="dailyTotals"><CalendarDays className="mr-2 h-4 w-4"/> Totales Diarios</TabsTrigger>
                        <TabsTrigger value="providerTotals"><Users className="mr-2 h-4 w-4"/> Totales por Proveedor</TabsTrigger>
                    </TabsList>

                    <TabsContent value="weeklySummary" className="mt-4">
                         <div className="flex justify-end mb-4">
                            <Button variant="outline" onClick={() => exportToPDF('weekly')}><Download className="mr-2 h-4 w-4" /> Exportar PDF</Button>
                        </div>
                        {weeklyTableData.length > 0 && deliveriesForWeek.length > 0 ? (
                             <ScrollArea className="max-h-[500px] rounded-md border whitespace-nowrap">
                                <Table>
                                    <TableCaption>Resumen de entregas por proveedor para la semana seleccionada.</TableCaption>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="font-semibold sticky left-0 bg-card z-10">Proveedor</TableHead>
                                            {daysOfWeekHeaders.map(day => <TableHead key={day} className="text-right font-semibold">{day}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {weeklyTableData.map(row => (
                                            <TableRow key={row.providerName}>
                                                <TableCell className="font-medium sticky left-0 bg-card z-10">{row.providerName}</TableCell>
                                                {row.quantities.map((q, i) => <TableCell key={i} className="text-right">{q?.toFixed(2) ?? '-'}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <ScrollBar orientation="horizontal"/>
                            </ScrollArea>
                        ) : <EmptyState message="No se registraron entregas en esta semana." />}
                    </TabsContent>

                    <TabsContent value="dailyTotals" className="mt-4">
                        <div className="flex justify-end mb-4">
                            <Button variant="outline" onClick={() => exportToPDF('daily')}><Download className="mr-2 h-4 w-4" /> Exportar PDF</Button>
                        </div>
                        {sortedDailyTotals.length > 0 ? (
                             <ScrollArea className="max-h-[500px] rounded-md border">
                                <Table>
                                    <TableCaption>Total de materia prima recibida por día.</TableCaption>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Cantidad Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedDailyTotals.map(([date, total]) => (
                                            <TableRow key={date}>
                                                <TableCell>{capitalize(format(parseISO(date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                                                <TableCell className="text-right">{total.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        ) : <EmptyState message="No se registraron entregas en esta semana." />}
                    </TabsContent>

                    <TabsContent value="providerTotals" className="mt-4">
                        <div className="flex justify-end mb-4">
                            <Button variant="outline" onClick={() => exportToPDF('provider')}><Download className="mr-2 h-4 w-4" /> Exportar PDF</Button>
                        </div>
                        {enrichedVendorTotals.length > 0 ? (
                            <ScrollArea className="max-h-[500px] rounded-md border">
                                <Table>
                                    <TableCaption>Total a pagar por proveedor según su ciclo de pago.</TableCaption>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Proveedor</TableHead>
                                            <TableHead className="text-right">Cantidad</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                            <TableHead className="text-right">Total a Pagar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {enrichedVendorTotals.map(p => (
                                            <TableRow key={p.name}>
                                                <TableCell>{p.name}</TableCell>
                                                <TableCell className="text-right">{p.quantity.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">S/. {p.price.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">S/. {p.totalToPay.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold text-lg">Total General</TableCell>
                                            <TableCell className="text-right font-bold text-lg">S/. {grandTotalToPay.toFixed(2)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </ScrollArea>
                        ) : <EmptyState message="No se registraron entregas en esta semana." />}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      </main>
      
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
