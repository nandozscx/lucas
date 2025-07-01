
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { Delivery, Production as ProductionType, WholeMilk } from '@/types';
import { ArrowLeft, Cpu, CalendarIcon, Package, Milk, Scale, Percent, Save, Edit2, Trash2, ChevronLeft, ChevronRight, Download, ShoppingBag, Archive, Wallet, DollarSign, AlertCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import type jsPDF from 'jspdf';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PRODUCTION_STORAGE_KEY = 'dailySupplyTrackerProduction';
const WHOLE_MILK_STORAGE_KEY = 'dailySupplyTrackerWholeMilk';

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

const wholeMilkFormSchema = z.object({
  stockSacos: z.coerce.number().min(0, "El stock no puede ser negativo."),
  pricePerSaco: z.coerce.number().positive("El precio debe ser un número positivo.").min(0.01, "El precio debe ser mayor a cero."),
});

type WholeMilkFormData = z.infer<typeof wholeMilkFormSchema>;

export default function ProductionPage() {
  const [isClient, setIsClient] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [productionHistory, setProductionHistory] = useState<ProductionType[]>([]);
  const [wholeMilkData, setWholeMilkData] = useState<WholeMilk>({ stockSacos: 0, pricePerSaco: 0 });
  const [currentYear, setCurrentYear] = useState('');
  const [editingProduction, setEditingProduction] = useState<ProductionType | null>(null);
  const [productionToDelete, setProductionToDelete] = useState<ProductionType | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);
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

  const wholeMilkForm = useForm<WholeMilkFormData>({
    resolver: zodResolver(wholeMilkFormSchema),
    defaultValues: {
      stockSacos: 0,
      pricePerSaco: 0,
    }
  });

  const selectedDate = form.watch('date');
  const producedUnits = form.watch('producedUnits');
  const useWholeMilk = form.watch('useWholeMilk');
  const wholeMilkKilos = form.watch('wholeMilkKilos');

  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0, locale: es }));
    if (typeof window !== 'undefined') {
      const storedDeliveries = localStorage.getItem(DELIVERIES_STORAGE_KEY);
      if (storedDeliveries) setDeliveries(JSON.parse(storedDeliveries));

      const storedProduction = localStorage.getItem(PRODUCTION_STORAGE_KEY);
      if (storedProduction) setProductionHistory(JSON.parse(storedProduction));
      
      const storedWholeMilk = localStorage.getItem(WHOLE_MILK_STORAGE_KEY);
      if (storedWholeMilk) {
        const parsedData = JSON.parse(storedWholeMilk);
        // Basic check to see if data is in the new format
        if ('stockSacos' in parsedData && 'pricePerSaco' in parsedData) {
            setWholeMilkData(parsedData);
        }
      }
    }
  }, []);
  
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(PRODUCTION_STORAGE_KEY, JSON.stringify(productionHistory));
    }
  }, [productionHistory, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(WHOLE_MILK_STORAGE_KEY, JSON.stringify(wholeMilkData));
    }
  }, [wholeMilkData, isClient]);

  useEffect(() => {
    if (wholeMilkData) {
      wholeMilkForm.reset(wholeMilkData);
    }
  }, [wholeMilkData, wholeMilkForm]);
  
  const dailyRawMaterial = React.useMemo(() => {
    if (!selectedDate) return 0;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return deliveries
      .filter(d => d.date === dateStr)
      .reduce((sum, d) => sum + d.quantity, 0);
  }, [selectedDate, deliveries]);

  const additionalLitersFromMilk = useWholeMilk && wholeMilkKilos ? wholeMilkKilos * 10 : 0;
  const totalAdjustedRawMaterial = dailyRawMaterial + additionalLitersFromMilk;
  const transformationIndex = totalAdjustedRawMaterial > 0 && producedUnits > 0 ? ((producedUnits / totalAdjustedRawMaterial) - 1) * 100 : 0;
  
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
      const oldUsageInKilos = editingProduction.wholeMilkKilos || 0;
      const differenceInKilos = newUsageInKilos - oldUsageInKilos;
      if (differenceInKilos !== 0) {
          const differenceInSacos = differenceInKilos / 25;
          setWholeMilkData(prev => ({ ...prev, stockSacos: prev.stockSacos - differenceInSacos }));
      }

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
        description: `Se actualizó el registro del ${format(data.date, "PPP", { locale: es })}.`,
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
      
      if (newUsageInKilos > 0) {
        const sacosUsed = newUsageInKilos / 25;
        setWholeMilkData(prev => ({ ...prev, stockSacos: prev.stockSacos - sacosUsed }));
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
        description: `Se guardó el registro para el ${format(data.date, "PPP", { locale: es })}.`,
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

    const deletedUsageInKilos = productionToDelete.wholeMilkKilos || 0;
    if (deletedUsageInKilos > 0) {
        const sacosToRestore = deletedUsageInKilos / 25;
        setWholeMilkData(prev => ({ ...prev, stockSacos: prev.stockSacos + sacosToRestore }));
    }

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

  const { weekTitle, productionForCurrentWeek, totalWeeklyUnits, averageWeeklyIndex } = useMemo(() => {
    if (!currentWeekStart) {
      return { weekTitle: '', productionForCurrentWeek: [], totalWeeklyUnits: 0, averageWeeklyIndex: 0 };
    }

    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0, locale: es });
    const title = `Semana del ${format(currentWeekStart, "dd 'de' MMMM", { locale: es })} al ${format(currentWeekEnd, "dd 'de' MMMM 'de' yyyy", { locale: es })}`;

    const filtered = productionHistory.filter(p => {
      const productionDate = parseISO(p.date);
      return isWithinInterval(productionDate, { start: currentWeekStart, end: currentWeekEnd });
    }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const units = filtered.reduce((sum, p) => sum + p.producedUnits, 0);
    const indicesSum = filtered.reduce((sum, p) => sum + p.transformationIndex, 0);
    const avgIndex = filtered.length > 0 ? indicesSum / filtered.length : 0;

    return { weekTitle: title, productionForCurrentWeek: filtered, totalWeeklyUnits: units, averageWeeklyIndex: avgIndex };
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
      format(parseISO(p.date), 'PPP', { locale: es }),
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

  const handleUpdateWholeMilk = (data: WholeMilkFormData) => {
    setWholeMilkData(data);
    toast({
      title: "Datos Actualizados",
      description: "El stock y precio de la leche entera han sido actualizados.",
    });
  };

  const { kilosUsedToday, costToReplaceToday } = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaysProduction = productionHistory.find(p => p.date === todayStr);
    const usedInKilos = todaysProduction?.wholeMilkKilos || 0;
    const usedInSacos = usedInKilos / 25;
    const cost = usedInSacos * (wholeMilkData.pricePerSaco || 0);
    return { kilosUsedToday: usedInKilos, costToReplaceToday: cost };
  }, [productionHistory, wholeMilkData.pricePerSaco]);

  if (!isClient || !currentWeekStart) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
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
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg gap-4">
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
                <TabsTrigger value="production">Registro de Producción</TabsTrigger>
                <TabsTrigger value="wholeMilk">Gestión de Leche Entera</TabsTrigger>
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
                                                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
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
                                <CardDescription>{format(selectedDate, "PPP", { locale: es })}</CardDescription>
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
                                        </Button>
                                        <Button variant="outline" onClick={handleNextWeek}>
                                            <span className="hidden sm:inline">Semana Sig.</span>
                                            <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <ScrollArea className="h-[500px] rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead className="text-right">Materia Prima Total</TableHead>
                                                <TableHead className="text-right">Unidades Prod.</TableHead>
                                                <TableHead className="text-right">Índice</TableHead>
                                                <TableHead className="text-center w-[100px]">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productionForCurrentWeek.length > 0 ? (
                                                productionForCurrentWeek.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{format(parseISO(p.date), 'PPP', { locale: es })}</TableCell>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestionar Inventario</CardTitle>
                            <CardDescription>Actualiza el stock y el precio de compra de la leche entera.</CardDescription>
                        </CardHeader>
                        <Form {...wholeMilkForm}>
                            <form onSubmit={wholeMilkForm.handleSubmit(handleUpdateWholeMilk)}>
                                <CardContent className="space-y-4">
                                     <FormField
                                        control={wholeMilkForm.control}
                                        name="stockSacos"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Stock Actual (Sacos de 25kg)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Ej: 4" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={wholeMilkForm.control}
                                        name="pricePerSaco"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Precio de Compra (por Saco)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Ej: 60.00" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" className="w-full">
                                    <Save className="mr-2 h-4 w-4"/>
                                    Actualizar Inventario
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    </Card>
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Métricas Clave</CardTitle>
                                <CardDescription>Información sobre tu inventario y uso.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {wholeMilkData.stockSacos < 0 && (
                                    <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Stock Negativo</AlertTitle>
                                    <AlertDescription>
                                        Tu inventario de leche entera es negativo. Por favor, actualiza tu stock.
                                    </AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center"><Archive className="mr-2 h-4 w-4"/> Stock Actual</span>
                                    <span className={`font-bold ${wholeMilkData.stockSacos < 0 ? 'text-destructive' : ''}`}>{wholeMilkData.stockSacos.toLocaleString()} sacos</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center"><DollarSign className="mr-2 h-4 w-4"/> Precio por Saco</span>
                                    <span className="font-bold">S/. {wholeMilkData.pricePerSaco.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    </div>
                </div>
            </TabsContent>
        </Tabs>
      </main>
      
      <AlertDialog open={!!productionToDelete} onOpenChange={(open) => !open && setProductionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de producción del {productionToDelete ? format(parseISO(productionToDelete.date), 'PPP', { locale: es }) : ''}.
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

      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {currentYear} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
