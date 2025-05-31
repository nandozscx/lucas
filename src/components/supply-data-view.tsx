
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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ListChecks, Users, CalendarDays, Info, CalendarRange } from 'lucide-react';
import { format, parseISO, getDay, startOfWeek, endOfWeek, isWithinInterval, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

interface SupplyDataViewProps {
  deliveries: Delivery[];
  dailyTotals: Record<string, number>;
  vendorTotals: VendorTotal[];
  onDeleteDelivery: (id: string) => void;
  providers: Provider[];
}

const SupplyDataView: React.FC<SupplyDataViewProps> = ({ deliveries, dailyTotals, vendorTotals, onDeleteDelivery, providers }) => {
  
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() => startOfWeek(new Date(), { weekStartsOn: 0, locale: es }));

  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };
  
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0, locale: es });

  const deliveriesForCurrentWeek = deliveries.filter(d => {
    const deliveryDate = parseISO(d.date);
    return isWithinInterval(deliveryDate, { start: currentWeekStart, end: currentWeekEnd });
  });

  const weeklyTableData = providers.map(provider => {
    const row: { providerName: string; quantities: (number | undefined)[] } = {
      providerName: provider.name,
      quantities: Array(7).fill(undefined),
    };
    deliveriesForCurrentWeek
      .filter(d => d.providerName === provider.name)
      .forEach(delivery => {
        const deliveryDate = parseISO(delivery.date);
        const dayIndex = getDay(deliveryDate); // Sunday is 0, Saturday is 6
        row.quantities[dayIndex] = (row.quantities[dayIndex] || 0) + delivery.quantity;
      });
    return row;
  });

  const daysOfWeekHeaders = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  
  // Original sorted deliveries for "Historial Detallado" tab
  const sortedDeliveries = [...deliveries].sort((a, b) => {
    const dateComparison = parseISO(b.date).getTime() - parseISO(a.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    return a.providerName.localeCompare(b.providerName);
  });

  const sortedDailyTotals = Object.entries(dailyTotals).sort(([dateA], [dateB]) => 
    parseISO(dateB).getTime() - parseISO(dateA).getTime()
  );

  const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md">
      <Info className="h-12 w-12 mb-3 opacity-50" />
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
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="weeklySummary" className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarRange className="h-4 w-4 sm:h-5 sm:w-5"/> Resumen Semanal
            </TabsTrigger>
            <TabsTrigger value="allDeliveries" className="flex items-center gap-2 text-sm sm:text-base">
              <ListChecks className="h-4 w-4 sm:h-5 sm:w-5"/> Historial Detallado
            </TabsTrigger>
            <TabsTrigger value="dailyTotals" className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5"/> Totales Diarios
            </TabsTrigger>
            <TabsTrigger value="vendorTotals" className="flex items-center gap-2 text-sm sm:text-base">
              <Users className="h-4 w-4 sm:h-5 sm:w-5"/> Totales por Proveedor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weeklySummary">
            <div className="flex justify-between items-center mb-4">
              <Button onClick={handlePreviousWeek} variant="outline">Semana Anterior</Button>
              <div className="text-center">
                <p className="font-semibold text-primary">
                  Semana del {format(currentWeekStart, "dd 'de' MMMM", { locale: es })} al {format(currentWeekEnd, "dd 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
              <Button onClick={handleNextWeek} variant="outline">Semana Siguiente</Button>
            </div>
            {providers.length === 0 ? (
              <EmptyState message="No hay proveedores registrados para mostrar el resumen semanal." />
            ) : weeklyTableData.every(row => row.quantities.every(q => q === undefined)) && deliveriesForCurrentWeek.length === 0 ? (
               <EmptyState message="No hay entregas registradas para esta semana." />
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold sticky left-0 bg-card z-10 min-w-[150px]">Proveedor</TableHead>
                      {daysOfWeekHeaders.map(day => (
                        <TableHead key={day} className="text-right font-semibold min-w-[100px]">{day}</TableHead>
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
                {weeklyTableData.length > 5 && <TableCaption>Desplázate para ver más proveedores o días.</TableCaption>}
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="allDeliveries">
            {sortedDeliveries.length === 0 ? (
              <EmptyState message="Aún no se han registrado entregas. Añade una usando el formulario." />
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Proveedor</TableHead>
                      <TableHead className="font-semibold">Fecha</TableHead>
                      <TableHead className="text-right font-semibold">Cantidad</TableHead>
                      <TableHead className="text-right font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDeliveries.map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell className="font-medium">{delivery.providerName}</TableCell>
                        <TableCell>{format(parseISO(delivery.date), "PP", { locale: es })}</TableCell>
                        <TableCell className="text-right">{delivery.quantity.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => onDeleteDelivery(delivery.id)} aria-label={`Eliminar entrega de ${delivery.providerName} el ${format(parseISO(delivery.date), "PP", { locale: es })}`}>
                            <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                   {sortedDeliveries.length > 5 && <TableCaption>Desplázate para ver más entradas.</TableCaption>}
                </Table>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="dailyTotals">
             {sortedDailyTotals.length === 0 ? (
              <EmptyState message="Los totales diarios aparecerán aquí una vez que se añadan entregas." />
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Fecha</TableHead>
                      <TableHead className="text-right font-semibold">Cantidad Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDailyTotals.map(([date, total]) => (
                      <TableRow key={date}>
                        <TableCell className="font-medium">{format(parseISO(date), "PP", { locale: es })}</TableCell>
                        <TableCell className="text-right">{total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                   {sortedDailyTotals.length > 5 && <TableCaption>Desplázate para ver más entradas.</TableCaption>}
                </Table>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="vendorTotals">
            {vendorTotals.length === 0 ? (
              <EmptyState message="Los totales por proveedor se calcularán y mostrarán aquí." />
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Proveedor</TableHead>
                      <TableHead className="text-right font-semibold">Cantidad Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorTotals.map((vendor) => (
                      <TableRow key={vendor.originalName}>
                        <TableCell className="font-medium">{vendor.originalName}</TableCell>
                        <TableCell className="text-right">{vendor.totalQuantity.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                   {vendorTotals.length > 5 && <TableCaption>Desplázate para ver más entradas.</TableCaption>}
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
