
"use client";

import React from 'react';
import type { Delivery, Provider } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, CalendarDays, Info, CalendarRange, ShoppingBag, Download } from 'lucide-react';
import { format, parseISO, getDay, startOfWeek, endOfWeek, isWithinInterval, addDays, nextSaturday, previousFriday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { capitalize } from '@/lib/utils';
import type jsPDF from 'jspdf';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

interface SupplyDataViewProps {
  deliveries: Delivery[];
  dailyTotals: Record<string, number>;
  providers: Provider[];
}

const SupplyDataView: React.FC<SupplyDataViewProps> = ({ deliveries, dailyTotals, providers }) => {
  
  const { toast } = useToast();
  const [weekDates, setWeekDates] = React.useState<{start: Date, end: Date} | null>(null);

  React.useEffect(() => {
    // This effect runs only on the client
    const start = startOfWeek(new Date(), { weekStartsOn: 0, locale: es });
    const end = endOfWeek(start, { weekStartsOn: 0, locale: es });
    setWeekDates({ start, end });
  }, []);

  if (!weekDates) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl text-primary">Información de Entregas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[550px]" />
        </CardContent>
      </Card>
    );
  }

  const { start: currentWeekStart, end: currentWeekEnd } = weekDates;

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
        const dayIndex = getDay(deliveryDate); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
        row.quantities[dayIndex] = (row.quantities[dayIndex] || 0) + delivery.quantity;
      });
    return row;
  });

  const daysOfWeekHeaders = Array.from({ length: 7 }).map((_, i) => 
    capitalize(format(addDays(currentWeekStart, i), "EEEE", { locale: es }))
  );
  
  const sortedDailyTotals = Object.entries(dailyTotals).sort(([dateA], [dateB]) => 
    parseISO(dateB).getTime() - parseISO(dateA).getTime()
  );

  const enrichedVendorTotalsForCurrentWeek = React.useMemo(() => {
    const today = new Date();
    // Standard week (e.g., Sunday to Saturday)
    const standardWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    const standardWeekEnd = endOfWeek(today, { weekStartsOn: 0 });
    // Lucio's week (Saturday to Friday)
    const lucioWeekEnd = getDay(today) === 6 ? today : previousFriday(today); // If today is Saturday, it's the start of a new week for others, but end of an old one for Lucio
    const lucioWeekStart = getDay(lucioWeekEnd) === 5 ? nextSaturday(subDays(lucioWeekEnd, 7)) : startOfWeek(lucioWeekEnd, { weekStartsOn: 6 });


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
        const price = provider.price;
        const totalToPay = totalQuantity * price;

        return {
            originalName: provider.name,
            totalQuantity,
            price,
            totalToPay,
        };
    });
  }, [providers, deliveries]);


  const grandTotalToPay = enrichedVendorTotalsForCurrentWeek.reduce((sum, vendor) => sum + vendor.totalToPay, 0);
  
  const exportVendorTotalsToPDF = async () => {
    if (enrichedVendorTotalsForCurrentWeek.filter(v => v.totalQuantity > 0).length === 0) {
      toast({
        title: "Sin Datos",
        description: "No hay totales de proveedor para la semana actual para exportar.",
        variant: "destructive",
      });
      return;
    }
    
    const { default: jsPDFConstructor } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new (jsPDFConstructor as any)() as jsPDFWithAutoTable;
    const tableHeaders = ['Proveedor', 'Cantidad Total (Semanal)', 'Precio Unit.', 'Total a Pagar (Semanal)'];
    const tableBody = enrichedVendorTotalsForCurrentWeek
      .filter(v => v.totalQuantity > 0)
      .map(vendor => [
        vendor.originalName,
        vendor.totalQuantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        vendor.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        vendor.totalToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ]);

    const weekTitle = `Semana del ${format(currentWeekStart, "dd/MM/yy")} al ${format(currentWeekEnd, "dd/MM/yy")}`;

    doc.setFontSize(18);
    doc.text('Totales Semanales por Proveedor', 14, 15);
    doc.setFontSize(12);
    doc.text(weekTitle, 14, 22);

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      foot: [
        ['', '', 'Total General:', grandTotalToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })]
      ],
      footStyles: { fontStyle: 'bold', halign: 'right' },
      startY: 28,
    });

    doc.save(`totales_proveedor_${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
    toast({
      title: "Exportación PDF Exitosa",
      description: "Los totales por proveedor se han exportado a PDF.",
    });
  };

  const EmptyState: React.FC<{ message: string; icon?: React.ElementType }> = ({ message, icon: IconComponent = Info }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md min-h-[300px]">
      <IconComponent className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Hay Datos Disponibles</p>
      <p className="text-sm">{message}</p>
    </div>
  );
  
  return (
    <Card className="shadow-lg rounded-lg">
      <Tabs defaultValue="vendorTotals" className="w-full">
        <CardHeader>
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1">
              <TabsTrigger value="weeklySummary" className="flex items-center gap-2 text-sm sm:text-base">
                  <CalendarRange className="h-4 w-4 sm:h-5 sm:w-5"/> Resumen Semanal
              </TabsTrigger>
              <TabsTrigger value="dailyTotals" className="flex items-center gap-2 text-sm sm:text-base">
                  <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5"/> Totales Diarios
              </TabsTrigger>
              <TabsTrigger value="vendorTotals" className="flex items-center gap-2 text-sm sm:text-base">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5"/> Totales por Proveedor
              </TabsTrigger>
          </TabsList>
        </CardHeader>
      
        <div className="text-center pt-8 pb-4">
          <CardTitle className="text-xl text-primary">Información de Entregas</CardTitle>
          <CardDescription className="pt-2">
              Semana del {format(currentWeekStart, "dd/MM/yy")} al {format(currentWeekEnd, "dd/MM/yy")}
          </CardDescription>
        </div>

        <CardContent>
            <TabsContent value="weeklySummary">
                {providers.length === 0 ? (
                <EmptyState message="No hay proveedores registrados para mostrar el resumen semanal." icon={Users}/>
                ) : weeklyTableData.every(row => row.quantities.every(q => q === undefined)) && deliveriesForCurrentWeek.length === 0 ? (
                <EmptyState message="No hay entregas registradas para esta semana." icon={ShoppingBag}/>
                ) : (
                <ScrollArea className="max-h-[400px] rounded-md border whitespace-nowrap">
                    <Table>
                    {(weeklyTableData.length > 5 || daysOfWeekHeaders.length > 5) && <TableCaption>Desplázate para ver más proveedores o días.</TableCaption>}
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                        <TableHead className="font-semibold sticky left-0 bg-card z-10 min-w-[150px]">Proveedor</TableHead>
                        {daysOfWeekHeaders.map(day => (
                            <TableHead key={day} className="text-right font-semibold min-w-[100px] capitalize">{day}</TableHead>
                        ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {weeklyTableData.map((row) => (
                        <TableRow key={row.providerName}>
                            <TableCell className="font-medium sticky left-0 bg-card z-10">{row.providerName}</TableCell>
                            {row.quantities.map((quantity, index) => (
                            <TableCell key={index} className="text-right">
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
            </TabsContent>

            <TabsContent value="dailyTotals">
                {sortedDailyTotals.length === 0 ? (
                <EmptyState message="Los totales diarios aparecerán aquí una vez que se añadan entregas." icon={CalendarDays}/>
                ) : (
                <ScrollArea className="max-h-[400px] rounded-md border">
                    <Table>
                    {sortedDailyTotals.length > 5 && <TableCaption>Desplázate para ver más entradas.</TableCaption>}
                    <TableHeader>
                        <TableRow>
                        <TableHead className="font-semibold">Fecha</TableHead>
                        <TableHead className="text-right font-semibold">Cantidad Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedDailyTotals.map(([date, total]) => (
                        <TableRow key={date}>
                            <TableCell className="font-medium">{capitalize(format(parseISO(date), "EEEE, dd/MM", { locale: es }))}</TableCell>
                            <TableCell className="text-right">{total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </ScrollArea>
                )}
            </TabsContent>

            <TabsContent value="vendorTotals">
                <div className="flex justify-end mb-4">
                </div>
                {enrichedVendorTotalsForCurrentWeek.filter(v => v.totalQuantity > 0).length === 0 ? (
                <EmptyState message="Los totales por proveedor para la semana actual se calcularán y mostrarán aquí." icon={Users}/>
                ) : (
                <ScrollArea className="max-h-[400px] rounded-md border whitespace-nowrap">
                    <Table>
                    {enrichedVendorTotalsForCurrentWeek.length > 5 && <TableCaption>Desplázate para ver más entradas.</TableCaption>}
                    <TableHeader>
                        <TableRow>
                        <TableHead className="font-semibold">Proveedor</TableHead>
                        <TableHead className="text-right font-semibold">Cantidad Total (Semanal)</TableHead>
                        <TableHead className="text-right font-semibold">Precio Unit.</TableHead>
                        <TableHead className="text-right font-semibold">Total a Pagar (Semanal)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enrichedVendorTotalsForCurrentWeek.map((vendor) => (
                        vendor.totalQuantity > 0 &&
                        <TableRow key={vendor.originalName}>
                            <TableCell className="font-medium">{vendor.originalName}</TableCell>
                            <TableCell className="text-right">{vendor.totalQuantity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                            <TableCell className="text-right">{vendor.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                            <TableCell className="text-right">{vendor.totalToPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold text-lg">Total General:</TableCell>
                        <TableCell className="text-right font-bold text-lg">
                            {grandTotalToPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </TableCell>
                        </TableRow>
                    </TableFooter>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                )}
            </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default SupplyDataView;
