
"use client";

import React from 'react';
import type { Delivery, VendorTotal, Provider } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, CalendarDays, Info, CalendarRange, DollarSign, ShoppingBag } from 'lucide-react';
import { format, parseISO, getDay, startOfWeek, endOfWeek, isWithinInterval, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface SupplyDataViewProps {
  deliveries: Delivery[];
  dailyTotals: Record<string, number>;
  vendorTotals: VendorTotal[];
  providers: Provider[];
}

const SupplyDataView: React.FC<SupplyDataViewProps> = ({ deliveries, dailyTotals, vendorTotals, providers }) => {
  
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0, locale: es }); // Sunday as start
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
        const dayIndex = getDay(deliveryDate); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
        row.quantities[dayIndex] = (row.quantities[dayIndex] || 0) + delivery.quantity;
      });
    return row;
  });

  const daysOfWeekHeaders = Array.from({ length: 7 }).map((_, i) => 
    format(addDays(currentWeekStart, i), "EEEE", { locale: es })
  );
  
  const sortedDailyTotals = Object.entries(dailyTotals).sort(([dateA], [dateB]) => 
    parseISO(dateB).getTime() - parseISO(dateA).getTime()
  );

  const enrichedVendorTotals = vendorTotals.map(vt => {
    const providerInfo = providers.find(p => p.name === vt.originalName);
    const price = providerInfo?.price ?? 0;
    const totalToPay = vt.totalQuantity * price;
    return {
      ...vt,
      price,
      totalToPay,
    };
  }).sort((a, b) => a.originalName.localeCompare(b.originalName));


  const EmptyState: React.FC<{ message: string; icon?: React.ElementType }> = ({ message, icon: Icon = Info }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md">
      <Icon className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Hay Datos Disponibles</p>
      <p className="text-sm">{message}</p>
    </div>
  );
  
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Información de Entregas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weeklySummary" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 mb-6">
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

          <TabsContent value="weeklySummary">
            <div className="mb-4">
              <div className="text-center">
                <p className="font-semibold text-primary">
                  Semana del {format(currentWeekStart, "dd 'de' MMMM", { locale: es })} al {format(currentWeekEnd, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
            {providers.length === 0 ? (
              <EmptyState message="No hay proveedores registrados para mostrar el resumen semanal." icon={Users}/>
            ) : weeklyTableData.every(row => row.quantities.every(q => q === undefined)) && deliveriesForCurrentWeek.length === 0 ? (
               <EmptyState message="No hay entregas registradas para esta semana." icon={ShoppingBag}/>
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border whitespace-nowrap">
                <Table>
                  {(weeklyTableData.length > 5 || daysOfWeekHeaders.length > 5) && <TableCaption>Desplázate para ver más proveedores o días.</TableCaption>}
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="font-semibold sticky left-0 bg-card z-10 min-w-[150px] pl-4">Proveedor</TableHead>
                      {daysOfWeekHeaders.map(day => (
                        <TableHead key={day} className="text-right font-semibold min-w-[100px] capitalize pr-4">{day}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyTableData.map((row) => (
                      <TableRow key={row.providerName}>
                        <TableCell className="font-medium sticky left-0 bg-card z-10 pl-4">{row.providerName}</TableCell>
                        {row.quantities.map((quantity, index) => (
                          <TableCell key={index} className="text-right pr-4">
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
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  {sortedDailyTotals.length > 5 && <TableCaption>Desplázate para ver más entradas.</TableCaption>}
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold pl-4">Fecha</TableHead>
                      <TableHead className="text-right font-semibold pr-4">Cantidad Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDailyTotals.map(([date, total]) => (
                      <TableRow key={date}>
                        <TableCell className="font-medium pl-4">{format(parseISO(date), "PPP", { locale: es })}</TableCell>
                        <TableCell className="text-right pr-4">{total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="vendorTotals">
            {enrichedVendorTotals.length === 0 ? (
              <EmptyState message="Los totales por proveedor se calcularán y mostrarán aquí." icon={Users}/>
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  {enrichedVendorTotals.length > 5 && <TableCaption>Desplázate para ver más entradas.</TableCaption>}
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold pl-4">Proveedor</TableHead>
                      <TableHead className="text-right font-semibold">Cantidad Total</TableHead>
                      <TableHead className="text-right font-semibold">Precio Unit.</TableHead>
                      <TableHead className="text-right font-semibold pr-4">Total a Pagar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedVendorTotals.map((vendor) => (
                      <TableRow key={vendor.originalName}>
                        <TableCell className="font-medium pl-4">{vendor.originalName}</TableCell>
                        <TableCell className="text-right">{vendor.totalQuantity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-right">{vendor.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-right pr-4">{vendor.totalToPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
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
  );
};

export default SupplyDataView;


    