
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { Delivery, Production as ProductionType, WholeMilkReplenishment } from '@/types';
import { ArrowLeft, Cpu, CalendarIcon, Package, Milk, Scale, Percent, Save, Edit2, Trash2, ChevronLeft, ChevronRight, Download, ShoppingBag, Archive, Wallet, DollarSign, AlertCircle, PlusCircle, History } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn, capitalize } from '@/lib/utils';
import type jsPDF from 'jspdf';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PRODUCTION_STORAGE_KEY = 'dailySupplyTrackerProduction';
const WHOLE_MILK_STORAGE_KEY = 'dailySupplyTrackerWholeMilk'; // For migration
const WHOLE_MILK_REPLENISHMENTS_STORAGE_KEY = 'dailySupplyTrackerWholeMilkReplenishments';

const productionFormSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  producedUnits: z.coerce
    .number({ invalid_type_error: "Debe ser un número." })
    .positive({ message: "Las unidades deben ser un número positivo." })
    .min(1, { message: "Debe registrar al menos una unidad." }),
  useWholeMilk: z.boolean().default(false),
  wholeMilkKilos: z.coerce
    .number({ invalid_type_error: "Debe ser un número." })
    .min(0, { message: "Los kilos no pueden ser negativos." })
    .optional(),
}).refine(data => !data.useWholeMilk || (data.useWholeMilk && data.wholeMilkKilos !== undefined && data.wholeMilkKilos > 0), {
  message: "Debe ingresar los kilos de leche entera si selecciona la opción.",
  path: ["wholeMilkKilos"],
});

type ProductionFormData = z.infer<typeof productionFormSchema>;

const replenishmentFormSchema = z.object({
  date: z.date({ required_error: "La fecha es obligatoria." }),
  quantitySacos: z.coerce.number().positive("La cantidad debe ser un número positivo."),
  pricePerSaco: z.coerce.number().positive("El precio debe ser un número positivo."),
});

type ReplenishmentFormData = z.infer<typeof replenishmentFormSchema>;

export default function ProductionPage() {
  const [isClient, setIsClient] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [productionHistory, setProductionHistory] = useState<ProductionType[]>([]);
  const [replenishmentHistory, setReplenishmentHistory] = useState<WholeMilkReplenishment[]>([]);
  const [currentYear, setCurrentYear] = useState('');
  const [editingProduction, setEditingProduction] = useState<ProductionType | null>(null);
  const [productionToDelete, setProductionToDelete] = useState<ProductionType | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);
  const [isReplenishmentDialogOpen, setIsReplenishmentDialogOpen] = useState(false);
  const [editingReplenishment, setEditingReplenishment] = useState<WholeMilkReplenishment | null>(null);
  const [replenishmentToDelete, setReplenishmentToDelete] = useState<WholeMilkReplenishment | null>(null);
  const { toast } = useToast();

  const form = useForm<ProductionFormData>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      date: new Date(),
      producedUnits: undefined,
      useWholeMilk: false,
      wholeMilkKilos: undefined,
    },
  });

  const selectedDate = form.watch('date');
  const producedUnitsValue = form.watch('producedUnits');
  const useWholeMilk = form.watch('useWholeMilk');
  const wholeMilkKilosValue = form.watch('wholeMilkKilos');

  const loadData = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedDeliveries = localStorage.getItem(DELIVERIES_STORAGE_KEY);
      if (storedDeliveries) setDeliveries(JSON.parse(storedDeliveries));

      const storedProduction = localStorage.getItem(PRODUCTION_STORAGE_KEY);
      if (storedProduction) setProductionHistory(JSON.parse(storedProduction));
      
      const storedReplenishments = localStorage.getItem(WHOLE_MILK_REPLENISHMENTS_STORAGE_KEY);
      if (storedReplenishments) {
          setReplenishmentHistory(JSON.parse(storedReplenishments));
      } else {
          // Migration from old system
          const storedOldWholeMilkData = localStorage.getItem(WHOLE_MILK_STORAGE_KEY);
          if (storedOldWholeMilkData) {
              const oldData = JSON.parse(storedOldWholeMilkData);
              if (oldData && oldData.stockSacos > 0) {
                  const initialReplenishment: WholeMilkReplenishment = {
                      id: crypto.randomUUID(),
                      date: format(new Date(), "yyyy-MM-dd"), // Assume today's date for migration
                      quantitySacos: oldData.stockSacos,
                      pricePerSaco: oldData.pricePerSaco,
                  };
                  setReplenishmentHistory([initialReplenishment]);
              }
          }
      }
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0, locale: es }));
    loadData();

    if (typeof window !== 'undefined') {
        window.addEventListener('storage-update', loadData);
    }
    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage-update', loadData);
        }
    }
  }, [loadData]);
  
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(PRODUCTION_STORAGE_KEY, JSON.stringify(productionHistory));
    }
  }, [productionHistory, isClient]);
  
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(WHOLE_MILK_REPLENISHMENTS_STORAGE_KEY, JSON.stringify(replenishmentHistory));
    }
  }, [replenishmentHistory, isClient]);
  
  const dailyRawMaterial = React.useMemo(() => {
    if (!selectedDate) return 0;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return deliveries
      .filter(d => d.date === dateStr)
      .reduce((sum, d) => sum + d.quantity, 0);
  }, [selectedDate, deliveries]);

  const additionalLitersFromMilk = useWholeMilk && wholeMilkKilosValue ? Number(wholeMilkKilosValue) * 10 : 0;
  const totalAdjustedRawMaterial = dailyRawMaterial + additionalLitersFromMilk;
  const transformationIndex = totalAdjustedRawMaterial > 0 && producedUnitsValue ? ((Number(producedUnitsValue) / totalAdjustedRawMaterial) - 1) * 100 : 0;
  
  const handleFormSubmit = (data: ProductionFormData) => {
    const dateStr = format(data.date, 'yyyy-MM-dd');
    
    const rawMaterialForDay = deliveries
      .filter(d => d.date === dateStr)
      .reduce((sum, d) => sum + d.quantity, 0);

    const newUsageInKilos = data.useWholeMilk && data.wholeMilkKilos ? data.wholeMilkKilos : 0;
    const additionalLiters = newUsageInKilos * 10;
    const totalRawMaterial = rawMaterialForDay + additionalLiters;
    const newTransformationIndex = totalRawMaterial > 0 && data.producedUnits > 0 ? ((data.producedUnits / totalRawMaterial) - 1) * 100 : 0;

    if (editingProduction) {
      const updatedRecord: ProductionType = {
        ...editingProduction,
        date: dateStr,
        producedUnits: data.producedUnits,
        wholeMilkKilos: newUsageInKilos,
        rawMaterialLiters: rawMaterialForDay,
        transformationIndex: newTransformationIndex,
      };

      setProductionHistory(prev => 
        prev.map(p => p.id === editingProduction.id ? updatedRecord : p)
           .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      );

      toast({
        title: "Registro Actualizado",
        description: `Se actualizó el registro del ${capitalize(format(data.date, "EEEE, dd/MM", { locale: es }))}.`,
      });
      setEditingProduction(null);

    } else {
      const existingRecord = productionHistory.find(p => p.date === dateStr);
      if (existingRecord) {
        toast({
          title: "Registro Duplicado",
          description: `Ya existe un registro para esta fecha. Puede editar el registro existente desde el historial.`,
          variant: "destructive",
        });
        return;
      }

      const newProductionRecord: ProductionType = {
        id: crypto.randomUUID(),
        date: dateStr,
        producedUnits: data.producedUnits,
        wholeMilkKilos: newUsageInKilos,
        rawMaterialLiters: rawMaterialForDay,
        transformationIndex: newTransformationIndex,
      };

      setProductionHistory(prev => 
        [...prev, newProductionRecord].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      );

      toast({
        title: "Producción Registrada",
        description: `Se guardó el registro para el ${capitalize(format(data.date, "EEEE, dd/MM", { locale: es }))}.`,
      });
    }
    
    form.reset({
        date: new Date(),
        producedUnits: undefined,
        useWholeMilk: false,
        wholeMilkKilos: undefined,
    });
  };

  const handleOpenEditDialog = (productionRecord: ProductionType) => {
    setEditingProduction(productionRecord);
    form.reset({
      date: parseISO(productionRecord.date),
      producedUnits: productionRecord.producedUnits,
      useWholeMilk: productionRecord.wholeMilkKilos > 0,
      wholeMilkKilos: productionRecord.wholeMilkKilos > 0 ? productionRecord.wholeMilkKilos : undefined,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingProduction(null);
      form.reset({
          date: new Date(),
          producedUnits: undefined,
          useWholeMilk: false,
          wholeMilkKilos: undefined,
      });
  };

  const confirmDeleteProduction = () => {
    if (!productionToDelete) return;

    setProductionHistory(prev => prev.filter(p => p.id !== productionToDelete.id));
    toast({
      title: "Registro Eliminado",
      description: "El registro de producción ha sido eliminado.",
      variant: "destructive",
    });
    setProductionToDelete(null);
  };
  
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

  const { weekTitle, productionForCurrentWeek, totalWeeklyUnits, averageWeeklyIndex, currentWeekEnd } = useMemo(() => {
    if (!currentWeekStart) {
      return { weekTitle: '', productionForCurrentWeek: [], totalWeeklyUnits: 0, averageWeeklyIndex: 0, currentWeekEnd: null };
    }

    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0, locale: es });
    const title = `Semana: ${format(currentWeekStart, "dd/MM/yy")} - ${format(weekEnd, "dd/MM/yy")}`;

    const filtered = productionHistory.filter(p => {
      const productionDate = parseISO(p.date);
      return isWithinInterval(productionDate, { start: currentWeekStart, end: weekEnd });
    }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const units = filtered.reduce((sum, p) => sum + p.producedUnits, 0);
    const indicesSum = filtered.reduce((sum, p) => sum + p.transformationIndex, 0);
    const avgIndex = filtered.length > 0 ? indicesSum / filtered.length : 0;

    return { weekTitle: title, productionForCurrentWeek: filtered, totalWeeklyUnits: units, averageWeeklyIndex: avgIndex, currentWeekEnd: weekEnd };
  }, [currentWeekStart, productionHistory]);
  
  const exportHistoryToPDF = async () => {
    if (productionForCurrentWeek.length === 0) {
      toast({ title: "Sin Datos", description: "No hay datos de producción en la semana actual para exportar.", variant: "destructive" });
      return;
    }

    const { default: jsPDFConstructor } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDFConstructor() as jsPDFWithAutoTable;

    const tableHeaders = ['Fecha', 'Materia Prima Total', 'Unidades Prod.', 'Índice de Transf.'];
    const tableBody = productionForCurrentWeek.map(p => [
      capitalize(format(parseISO(p.date), 'EEEE, dd/MM', { locale: es })),
      `${(p.rawMaterialLiters + (p.wholeMilkKilos * 10)).toLocaleString()} L`,
      p.producedUnits.toLocaleString(),
      `${p.transformationIndex.toFixed(2)}%`
    ]);

    doc.setFontSize(18);
    doc.text('Historial de Producción Semanal', 14, 15);
    doc.setFontSize(12);
    doc.text(weekTitle, 14, 22);

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 28,
      foot: [
        ['Total Semanal', '', totalWeeklyUnits.toLocaleString(), `${averageWeeklyIndex.toFixed(2)}% (Promedio)`]
      ],
      footStyles: { fontStyle: 'bold' },
      didDrawPage: (data) => {
        if (data.pageNumber === 1) {
          doc.setFontSize(18);
          doc.text('Historial de Producción Semanal', data.settings.margin.left, 15);
          doc.setFontSize(12);
          doc.text(weekTitle, data.settings.margin.left, 22);
        }
      }
    });

    doc.save(`produccion_semanal_${format(currentWeekStart!, "yyyy-MM-dd")}.pdf`);
    toast({ title: "Exportación PDF Exitosa", description: "El historial de producción semanal se ha exportado a PDF." });
  };
  
  const { currentStockSacos, latestPricePerSaco } = useMemo(() => {
    const totalReplenished = replenishmentHistory.reduce((sum, r) => sum + r.quantitySacos, 0);
    const totalUsedInKilos = productionHistory.reduce((sum, p) => sum + (p.wholeMilkKilos || 0), 0);
    const totalUsedInSacos = totalUsedInKilos / 25;
    const stock = totalReplenished - totalUsedInSacos;

    const sortedHistory = [...replenishmentHistory].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    const price = sortedHistory.length > 0 ? sortedHistory[0].pricePerSaco : 0;

    return { currentStockSacos: stock, latestPricePerSaco: price };
  }, [replenishmentHistory, productionHistory]);
  
  const handleOpenEditReplenishmentDialog = (replenishment: WholeMilkReplenishment) => {
    setEditingReplenishment(replenishment);
    setIsReplenishmentDialogOpen(true);
  };

  const handleReplenishmentSubmit = (data: ReplenishmentFormData) => {
    if (editingReplenishment) {
      const updatedReplenishment: WholeMilkReplenishment = {
        ...editingReplenishment,
        ...data,
        date: format(data.date, "yyyy-MM-dd"),
      };
      setReplenishmentHistory(prev =>
        prev.map(r => (r.id === editingReplenishment.id ? updatedReplenishment : r))
            .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      );
      toast({ title: "Reabastecimiento Actualizado", description: `Se actualizó la entrada del ${capitalize(format(data.date, "EEEE, dd/MM", { locale: es }))}.` });
    } else {
      const newReplenishment: WholeMilkReplenishment = {
        id: crypto.randomUUID(),
        date: format(data.date, "yyyy-MM-dd"),
        quantitySacos: data.quantitySacos,
        pricePerSaco: data.pricePerSaco,
      };
      setReplenishmentHistory(prev => [...prev, newReplenishment].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      toast({ title: "Reabastecimiento Registrado", description: `Se agregaron ${data.quantitySacos} sacos al stock.` });
    }
    
    setIsReplenishmentDialogOpen(false);
    setEditingReplenishment(null);
  };

  const confirmDeleteReplenishment = () => {
    if (!replenishmentToDelete) return;
    setReplenishmentHistory(prev => prev.filter(r => r.id !== replenishmentToDelete.id));
    toast({
      title: "Registro Eliminado",
      description: "El registro de reabastecimiento ha sido eliminado.",
      variant: "destructive",
    });
    setReplenishmentToDelete(null);
  };

  const { kilosUsedToday, costToReplaceToday } = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaysProduction = productionHistory.find(p => p.date === todayStr);
    const usedInKilos = todaysProduction?.wholeMilkKilos || 0;
    const usedInSacos = usedInKilos / 25;
    const cost = usedInSacos * (latestPricePerSaco || 0);
    return { kilosUsedToday: usedInKilos, costToReplaceToday: cost };
  }, [productionHistory, latestPricePerSaco]);
  
  const stockUsageHistory = useMemo(() => {
    const getPriceOnDate = (usageDateStr: string): number => {
        const usageDate = parseISO(usageDateStr);
        const sortedReplenishments = [...replenishmentHistory]
            .filter(r => parseISO(r.date) <= usageDate)
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        
        return sortedReplenishments.length > 0 ? sortedReplenishments[0].pricePerSaco : (latestPricePerSaco || 0);
    };
    
    return productionHistory
      .filter(p => p.wholeMilkKilos > 0)
      .map(p => {
          const pricePerSaco = getPriceOnDate(p.date);
          const cost = (p.wholeMilkKilos / 25) * pricePerSaco;
          return {
              date: p.date,
              kilosUsed: p.wholeMilkKilos,
              id: p.id,
              costToReplace: cost,
          }
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [productionHistory, replenishmentHistory, latestPricePerSaco]);

  const stockUsageForCurrentWeek = useMemo(() => {
      if (!currentWeekStart || !currentWeekEnd) return [];
      return stockUsageHistory.filter(usage => {
          const usageDate = parseISO(usage.date);
          return isWithinInterval(usageDate, { start: currentWeekStart, end: currentWeekEnd });
      });
  }, [stockUsageHistory, currentWeekStart, currentWeekEnd]);
  
  const weeklyUsageTotals = useMemo(() => {
      return stockUsageForCurrentWeek.reduce((totals, usage) => {
          totals.kilos += usage.kilosUsed;
          totals.cost += usage.costToReplace;
          return totals;
      }, { kilos: 0, cost: 0 });
  }, [stockUsageForCurrentWeek]);

  if (!isClient || !currentWeekStart) {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
        <header className="flex items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
        </header>
        <main className="flex-grow space-y-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
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
          <Cpu className="mr-3 h-8 w-8" />
          Producción
        </h1>
        <div className="w-0 sm:w-auto"></div>
      </header>
      
      <main className="flex-grow">
        <Tabs defaultValue="production" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="production">R. Producción</TabsTrigger>
                <TabsTrigger value="wholeMilk">L. Entera</TabsTrigger>
            </TabsList>
            
            <TabsContent value="production" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <Card>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                                    <CardHeader>
                                        <CardTitle>{editingProduction ? 'Editar Registro' : 'Registrar Producción Diaria'}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="date"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Fecha de Producción</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? capitalize(format(field.value, "EEEE, dd/MM/yyyy", { locale: es })) : <span>Seleccione una fecha</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus locale={es}/>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="producedUnits"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Unidades Producidas</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="Ej: 240" {...field} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="useWholeMilk"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <FormLabel>¿Usó leche entera?</FormLabel>
                                                    </div>
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        {useWholeMilk && (
                                            <FormField
                                                control={form.control}
                                                name="wholeMilkKilos"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Kilos de Leche Entera Usados</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="Ej: 9" {...field} value={field.value ?? ''} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-2">
                                        <Button type="submit" className="w-full">
                                            <Save className="mr-2 h-4 w-4"/>
                                            {editingProduction ? 'Actualizar Registro' : 'Guardar Registro'}
                                        </Button>
                                        {editingProduction && (
                                            <Button variant="outline" onClick={handleCancelEdit} className="w-full">
                                                Cancelar Edición
                                            </Button>
                                        )}
                                    </CardFooter>
                                </form>
                            </Form>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Cálculos del Día</CardTitle>
                                <CardDescription>{capitalize(format(selectedDate, "EEEE, dd/MM/yyyy", { locale: es }))}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center"><Milk className="mr-2 h-4 w-4"/> Materia Prima (Entregas)</span>
                                    <span className="font-bold">{dailyRawMaterial.toLocaleString()} L</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center"><Scale className="mr-2 h-4 w-4"/> Leche Entera Adicional</span>
                                    <span className="font-bold">{additionalLitersFromMilk.toLocaleString()} L</span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-foreground font-semibold flex items-center"><Package className="mr-2 h-5 w-5"/> Total Materia Prima</span>
                                    <span className="font-extrabold text-primary">{totalAdjustedRawMaterial.toLocaleString()} L</span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-foreground font-semibold flex items-center"><Percent className="mr-2 h-5 w-5"/> Índice de Transformación</span>
                                    <span className={`font-extrabold ${transformationIndex >= 0 ? 'text-green-500' : 'text-destructive'}`}>{transformationIndex.toFixed(2)} %</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="text-center sm:text-left">
                                        <CardTitle>Historial de Producción</CardTitle>
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
                            <CardContent className="flex-1 flex flex-col">
                                <ScrollArea className="h-[450px] md:h-[500px] rounded-md border whitespace-nowrap">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead className="text-right">Materia Prima Total</TableHead>
                                                <TableHead className="text-right">Unidades Prod.</TableHead>
                                                <TableHead className="text-right">Índice</TableHead>
                                                <TableHead className="text-center">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productionForCurrentWeek.length > 0 ? (
                                                productionForCurrentWeek.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{capitalize(format(parseISO(p.date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                                                        <TableCell className="text-right">{(p.rawMaterialLiters + (p.wholeMilkKilos * 10)).toLocaleString()} L</TableCell>
                                                        <TableCell className="text-right">{p.producedUnits.toLocaleString()}</TableCell>
                                                        <TableCell className={`text-right font-medium ${p.transformationIndex >= 0 ? 'text-green-500' : 'text-red-500'}`}>{p.transformationIndex.toFixed(2)}%</TableCell>
                                                        <TableCell className="text-center">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(p)} aria-label="Editar registro">
                                                                <Edit2 className="h-4 w-4 text-blue-600" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => setProductionToDelete(p)} aria-label="Eliminar registro">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-24 text-center">
                                                    <EmptyState message="No hay registros de producción para esta semana."/>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                        {productionForCurrentWeek.length > 0 && (
                                        <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-right font-bold">Totales de la Semana:</TableCell>
                                                    <TableCell className="text-right font-bold">{totalWeeklyUnits.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-bold">{averageWeeklyIndex.toFixed(2)}% (Prom.)</TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableFooter>
                                        )}
                                    </Table>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="justify-end border-t pt-4">
                            <Button onClick={exportHistoryToPDF} disabled={productionForCurrentWeek.length === 0}>
                                <Download className="mr-2 h-4 w-4"/>
                                Exportar PDF de la Semana
                            </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </TabsContent>
            
            <TabsContent value="wholeMilk" className="mt-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-8 md:col-span-1 lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Reabastecer Stock</CardTitle>
                                <CardDescription>Agrega nuevas compras de leche entera a tu inventario.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => setIsReplenishmentDialogOpen(true)} className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Agregar Compra de Stock
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Métricas Clave</CardTitle>
                                <CardDescription>Información sobre tu inventario y uso.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {currentStockSacos < 0 && (
                                    <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Stock Negativo</AlertTitle>
                                    <AlertDescription>
                                        Has consumido más leche de la que tienes registrada. Por favor, actualiza tu inventario.
                                    </AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center"><Archive className="mr-2 h-4 w-4"/> Stock Actual</span>
                                    <span className={`font-bold ${currentStockSacos < 0 ? 'text-destructive' : ''}`}>{currentStockSacos.toLocaleString(undefined, { maximumFractionDigits: 2 })} sacos</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center"><DollarSign className="mr-2 h-4 w-4"/> Precio Última Compra (p/Saco)</span>
                                    <span className="font-bold">S/. {latestPricePerSaco.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center"><Milk className="mr-2 h-4 w-4"/> Uso de Hoy</span>
                                    <span className="font-bold">{kilosUsedToday.toLocaleString()} kg</span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-foreground font-semibold flex items-center"><Wallet className="mr-2 h-5 w-5"/> Costo de Reposición (Hoy)</span>
                                    <span className="font-extrabold text-primary">S/. {costToReplaceToday.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Historial de Salidas de Stock</CardTitle>
                                <CardDescription>Consumo de leche entera para la semana seleccionada.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[200px] rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Fecha de Uso</TableHead>
                                                <TableHead className="text-right">Kilos Usados</TableHead>
                                                <TableHead className="text-right">Costo Reposición</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stockUsageForCurrentWeek.length > 0 ? (
                                                stockUsageForCurrentWeek.map(usage => (
                                                    <TableRow key={usage.id}>
                                                        <TableCell>{capitalize(format(parseISO(usage.date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                                                        <TableCell className="text-right">{usage.kilosUsed.toLocaleString()} kg</TableCell>
                                                        <TableCell className="text-right">S/. {usage.costToReplace.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">
                                                        No se ha registrado uso de leche entera para esta semana.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                        {stockUsageForCurrentWeek.length > 0 && (
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="text-right font-bold">Totales:</TableCell>
                                                    <TableCell className="text-right font-bold">{weeklyUsageTotals.kilos.toLocaleString()} kg</TableCell>
                                                    <TableCell className="text-right font-bold">S/. {weeklyUsageTotals.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        )}
                                    </Table>
                                    <ScrollBar orientation="vertical" />
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                     <Card className="md:col-span-1 lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Historial de Reabastecimiento</CardTitle>
                            <CardDescription>Registro de todas las compras de leche entera.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-full max-h-[600px] rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Sacos</TableHead>
                                            <TableHead className="text-right">Precio p/Saco</TableHead>
                                            <TableHead className="text-center">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {replenishmentHistory.length > 0 ? (
                                            replenishmentHistory.map(r => (
                                                <TableRow key={r.id}>
                                                    <TableCell>{capitalize(format(parseISO(r.date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                                                    <TableCell className="text-right">{r.quantitySacos.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">S/. {r.pricePerSaco.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditReplenishmentDialog(r)} aria-label="Editar reabastecimiento">
                                                            <Edit2 className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => setReplenishmentToDelete(r)} aria-label="Eliminar reabastecimiento">
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No hay historial de compras.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                <ScrollBar orientation="vertical" />
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
      </main>
      
      <AlertDialog open={!!productionToDelete} onOpenChange={(open) => !open && setProductionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de producción del {productionToDelete ? capitalize(format(parseISO(productionToDelete.date), 'EEEE, dd/MM', { locale: es })) : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductionToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduction} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReplenishmentDialog
        isOpen={isReplenishmentDialogOpen}
        onClose={() => {
            setIsReplenishmentDialogOpen(false);
            setEditingReplenishment(null);
        }}
        onSubmit={handleReplenishmentSubmit}
        initialData={editingReplenishment}
      />
      
      <AlertDialog open={!!replenishmentToDelete} onOpenChange={(open) => !open && setReplenishmentToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de reabastecimiento del {replenishmentToDelete ? capitalize(format(parseISO(replenishmentToDelete.date), 'EEEE, dd/MM', { locale: es })) : ''}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setReplenishmentToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteReplenishment} className="bg-destructive hover:bg-destructive/90">
                    Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {currentYear} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

const ReplenishmentDialog = ({ isOpen, onClose, onSubmit, initialData }: { isOpen: boolean, onClose: () => void, onSubmit: (data: ReplenishmentFormData) => void, initialData?: WholeMilkReplenishment | null }) => {
    const form = useForm<ReplenishmentFormData>({
        resolver: zodResolver(replenishmentFormSchema),
        defaultValues: {
            date: new Date(),
            quantitySacos: undefined,
            pricePerSaco: undefined,
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                form.reset({
                    date: parseISO(initialData.date),
                    quantitySacos: initialData.quantitySacos,
                    pricePerSaco: initialData.pricePerSaco,
                });
            } else {
                 form.reset({
                    date: new Date(),
                    quantitySacos: undefined,
                    pricePerSaco: undefined,
                });
            }
        }
    }, [isOpen, initialData, form]);

    const handleFormSubmit = (data: ReplenishmentFormData) => {
        onSubmit(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Editar Compra' : 'Agregar Compra de Stock'}</DialogTitle>
                    <DialogDescription>
                       {initialData ? 'Actualiza los detalles de esta compra.' : 'Registra una nueva compra de leche entera en sacos.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Compra</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? capitalize(format(field.value, "EEEE, dd/MM/yyyy", { locale: es })) : <span>Seleccione una fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus locale={es}/>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="quantitySacos"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad (Sacos de 25kg)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Ej: 10" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pricePerSaco"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Precio por Saco</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Ej: 65.50" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button type="submit">{initialData ? 'Guardar Cambios' : 'Guardar Compra'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

    