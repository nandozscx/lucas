"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Delivery, Production as ProductionType } from '@/types';
import { ArrowLeft, Cpu, CalendarIcon, Package, Milk, Scale, Percent, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PRODUCTION_STORAGE_KEY = 'dailySupplyTrackerProduction';

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

export default function ProductionPage() {
  const [isClient, setIsClient] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [productionHistory, setProductionHistory] = useState<ProductionType[]>([]);
  const [currentYear, setCurrentYear] = useState('');
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
  const producedUnits = form.watch('producedUnits');
  const useWholeMilk = form.watch('useWholeMilk');
  const wholeMilkKilos = form.watch('wholeMilkKilos');

  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());
    if (typeof window !== 'undefined') {
      const storedDeliveries = localStorage.getItem(DELIVERIES_STORAGE_KEY);
      if (storedDeliveries) setDeliveries(JSON.parse(storedDeliveries));

      const storedProduction = localStorage.getItem(PRODUCTION_STORAGE_KEY);
      if (storedProduction) setProductionHistory(JSON.parse(storedProduction));
    }
  }, []);
  
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(PRODUCTION_STORAGE_KEY, JSON.stringify(productionHistory));
    }
  }, [productionHistory, isClient]);
  
  const dailyRawMaterial = React.useMemo(() => {
    if (!selectedDate) return 0;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return deliveries
      .filter(d => d.date === dateStr)
      .reduce((sum, d) => sum + d.quantity, 0);
  }, [selectedDate, deliveries]);

  const additionalLitersFromMilk = useWholeMilk && wholeMilkKilos ? wholeMilkKilos * 10 : 0;
  const totalAdjustedRawMaterial = dailyRawMaterial + additionalLitersFromMilk;
  const transformationIndex = totalAdjustedRawMaterial > 0 && producedUnits > 0 ? (producedUnits / totalAdjustedRawMaterial) * 100 : 0;
  
  const handleFormSubmit = (data: ProductionFormData) => {
    const dateStr = format(data.date, 'yyyy-MM-dd');
    
    const newProductionRecord: ProductionType = {
      id: crypto.randomUUID(),
      date: dateStr,
      producedUnits: data.producedUnits,
      wholeMilkKilos: data.useWholeMilk ? data.wholeMilkKilos! : 0,
      rawMaterialLiters: dailyRawMaterial, // Storing the base for historical accuracy
      transformationIndex: transformationIndex,
    };

    setProductionHistory(prev => {
        const otherDays = prev.filter(p => p.date !== dateStr);
        return [...otherDays, newProductionRecord].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    });

    toast({
      title: "Producción Registrada",
      description: `Se guardó el registro para el ${format(data.date, "PPP", { locale: es })}.`,
    });
    
    form.reset({
        date: new Date(),
        producedUnits: undefined,
        useWholeMilk: false,
        wholeMilkKilos: undefined,
    });
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
        </header>
        <main className="flex-grow grid md:grid-cols-3 gap-8">
            <Skeleton className="md:col-span-1 h-96"/>
            <Skeleton className="md:col-span-2 h-96"/>
        </main>
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
          <Cpu className="mr-3 h-8 w-8" />
          Registro de Producción
        </h1>
        <div className="w-0 sm:w-auto"></div>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                        <CardHeader>
                            <CardTitle>Registrar Producción Diaria</CardTitle>
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
                                            <FormLabel>Kilos de Leche Entera</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Ej: 5" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full"><Save className="mr-2 h-4 w-4"/> Guardar Registro</Button>
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
                        <span className={`font-extrabold ${transformationIndex > 100 ? 'text-green-500' : 'text-destructive'}`}>{transformationIndex.toFixed(2)} %</span>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Historial de Producción</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px] rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Materia Prima</TableHead>
                                    <TableHead className="text-right">Unidades Prod.</TableHead>
                                    <TableHead className="text-right">Índice</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productionHistory.length > 0 ? (
                                    productionHistory.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>{format(parseISO(p.date), 'PPP', { locale: es })}</TableCell>
                                            <TableCell className="text-right">{(p.rawMaterialLiters + (p.wholeMilkKilos * 10)).toLocaleString()} L</TableCell>
                                            <TableCell className="text-right">{p.producedUnits.toLocaleString()}</TableCell>
                                            <TableCell className={`text-right font-medium ${p.transformationIndex > 100 ? 'text-green-500' : 'text-red-500'}`}>{p.transformationIndex.toFixed(2)}%</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No hay registros de producción.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            {productionHistory.length > 8 && <TableCaption>Desplázate para ver más registros.</TableCaption>}
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </main>
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {currentYear} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
