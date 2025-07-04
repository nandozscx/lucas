"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

import type { Delivery, Provider, Production, Sale, Client } from '@/types';
import { ArrowLeft, BarChart3, Package, Cpu, ShoppingCart, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const deliveriesConfig = {
  quantity: { label: "Cantidad (L)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const productionConfig = {
  producedUnits: { label: "Unidades Producidas", color: "hsl(var(--chart-1))" },
  wholeMilkKilos: { label: "Leche Entera (kg)", color: "hsl(var(--chart-2))" },
  transformationIndex: { label: "Índice de Transformación (%)", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const salesConfig = {
  totalSales: { label: "Ventas Totales (S/.)", color: "hsl(var(--chart-1))" },
  totalDebt: { label: "Deuda Total (S/.)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;


const PIE_CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
];

const EmptyState: React.FC<{ message: string; icon?: React.ElementType }> = ({ message, icon: Icon = Info }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md min-h-[300px]">
      <Icon className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Hay Datos Disponibles</p>
      <p className="text-sm">{message}</p>
    </div>
  );


export default function StatisticsPage() {
    const [isClient, setIsClient] = useState(false);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [productionHistory, setProductionHistory] = useState<Production[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    const [deliveryRange, setDeliveryRange] = useState('month');
    const [productionRange, setProductionRange] = useState('month');
    const [salesRange, setSalesRange] = useState('month');

    useEffect(() => {
        setIsClient(true);
        if (typeof window !== 'undefined') {
            const storedDeliveries = localStorage.getItem('dailySupplyTrackerDeliveries');
            if (storedDeliveries) setDeliveries(JSON.parse(storedDeliveries));

            const storedProviders = localStorage.getItem('dailySupplyTrackerProviders');
            if (storedProviders) setProviders(JSON.parse(storedProviders));
            
            const storedProduction = localStorage.getItem('dailySupplyTrackerProduction');
            if (storedProduction) setProductionHistory(JSON.parse(storedProduction));
            
            const storedSales = localStorage.getItem('dailySupplyTrackerSales');
            if (storedSales) setSales(JSON.parse(storedSales));
            
            const storedClients = localStorage.getItem('dailySupplyTrackerClients');
            if (storedClients) setClients(JSON.parse(storedClients));
        }
    }, []);

    const getDateInterval = (range: string) => {
        const now = new Date();
        switch (range) {
            case 'week': return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
            case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
            case '6months': return { start: subMonths(now, 6), end: now };
            case 'year': return { start: startOfYear(now), end: endOfYear(now) };
            default: return null;
        }
    };
    
    const deliveriesData = useMemo(() => {
        const interval = getDateInterval(deliveryRange);
        const filteredDeliveries = interval ? deliveries.filter(d => isWithinInterval(parseISO(d.date), interval)) : deliveries;
        
        const dataByProvider = filteredDeliveries.reduce((acc, delivery) => {
            acc[delivery.providerName] = (acc[delivery.providerName] || 0) + delivery.quantity;
            return acc;
        }, {} as Record<string, number>);

        return providers.map(p => ({
            providerName: p.name,
            quantity: dataByProvider[p.name] || 0
        })).filter(d => d.quantity > 0).sort((a,b) => b.quantity - a.quantity);
    }, [deliveries, providers, deliveryRange]);
    
    const productionData = useMemo(() => {
        const interval = getDateInterval(productionRange);
        const filteredProduction = interval ? productionHistory.filter(p => isWithinInterval(parseISO(p.date), interval)) : productionHistory;
        
        return filteredProduction
            .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
            .map(p => ({
                date: format(parseISO(p.date), 'dd/MM', { locale: es }),
                producedUnits: p.producedUnits,
                wholeMilkKilos: p.wholeMilkKilos,
                transformationIndex: parseFloat(p.transformationIndex.toFixed(2))
            }));
    }, [productionHistory, productionRange]);

    const salesData = useMemo(() => {
        const interval = getDateInterval(salesRange);
        const filteredSales = interval ? sales.filter(s => isWithinInterval(parseISO(s.date), interval)) : sales;

        const dataByClient = filteredSales.reduce((acc, sale) => {
            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            const debt = sale.totalAmount - totalPaid;
            
            if (!acc[sale.clientName]) {
                acc[sale.clientName] = { clientName: sale.clientName, totalSales: 0, totalDebt: 0 };
            }
            acc[sale.clientName].totalSales += sale.totalAmount;
            acc[sale.clientName].totalDebt += debt > 0 ? debt : 0;
            return acc;
        }, {} as Record<string, { clientName: string, totalSales: number, totalDebt: number }>);
        
        return Object.values(dataByClient).sort((a,b) => b.totalSales - a.totalSales);
    }, [sales, clients, salesRange]);

    if (!isClient) {
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

    const DateRangeSelector = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Seleccionar Rango" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mes</SelectItem>
                <SelectItem value="6months">Últimos 6 Meses</SelectItem>
                <SelectItem value="year">Este Año</SelectItem>
                <SelectItem value="all">Todo</SelectItem>
            </SelectContent>
        </Select>
    );

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg gap-4">
            <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver al Panel
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
                <BarChart3 className="mr-3 h-8 w-8" />
                Estadísticas
            </h1>
            <div className="w-0 sm:w-auto"></div>
        </header>
        <main className="flex-grow">
            <Tabs defaultValue="deliveries" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                    <TabsTrigger value="deliveries" className="flex items-center gap-2"><Package className="h-4 w-4"/>Entregas</TabsTrigger>
                    <TabsTrigger value="production" className="flex items-center gap-2"><Cpu className="h-4 w-4"/>Producción</TabsTrigger>
                    <TabsTrigger value="sales" className="flex items-center gap-2"><ShoppingCart className="h-4 w-4"/>Ventas</TabsTrigger>
                </TabsList>

                <TabsContent value="deliveries" className="mt-6">
                    <Card>
                        <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1">
                                <CardTitle>Entregas por Proveedor</CardTitle>
                                <CardDescription>Cantidad total de materia prima recibida en el período seleccionado.</CardDescription>
                            </div>
                            <DateRangeSelector value={deliveryRange} onChange={setDeliveryRange} />
                        </CardHeader>
                        <CardContent>
                             {deliveriesData.length === 0 ? <EmptyState message="No hay entregas en el período seleccionado." icon={Package} /> :
                                <ChartContainer config={deliveriesConfig} className="min-h-[300px] w-full">
                                <BarChart data={deliveriesData} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="providerName" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                                </BarChart>
                                </ChartContainer>
                            }
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="production" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1">
                                <CardTitle>Rendimiento de Producción</CardTitle>
                                <CardDescription>Unidades producidas vs. leche entera usada.</CardDescription>
                            </div>
                            <DateRangeSelector value={productionRange} onChange={setProductionRange} />
                        </CardHeader>
                        <CardContent>
                            {productionData.length === 0 ? <EmptyState message="No hay datos de producción en el período seleccionado." icon={Cpu} /> :
                            <ChartContainer config={productionConfig} className="min-h-[300px] w-full">
                                <ComposedChart data={productionData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis yAxisId="left" orientation="left" label={{ value: 'Unidades / Kilos', angle: -90, position: 'insideLeft' }}/>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="producedUnits" fill="var(--color-producedUnits)" radius={4} />
                                    <Line yAxisId="left" type="monotone" dataKey="wholeMilkKilos" stroke="var(--color-wholeMilkKilos)" />
                                </ComposedChart>
                            </ChartContainer>
                            }
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Índice de Transformación</CardTitle>
                            <CardDescription>Evolución del índice de transformación a lo largo del tiempo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {productionData.length === 0 ? <EmptyState message="No hay datos de producción en el período seleccionado." icon={Cpu} /> :
                            <ChartContainer config={productionConfig} className="min-h-[300px] w-full">
                                <LineChart data={productionData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} unit="%"/>
                                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="transformationIndex" stroke="var(--color-transformationIndex)" strokeWidth={2} dot={false}/>
                                </LineChart>
                            </ChartContainer>
                            }
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="sales" className="mt-6 space-y-6">
                    <Card>
                         <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                             <div className="flex-1">
                                <CardTitle>Ventas por Cliente</CardTitle>
                                <CardDescription>Visualiza el total de ventas (S/.) por cada cliente.</CardDescription>
                            </div>
                            <DateRangeSelector value={salesRange} onChange={setSalesRange} />
                        </CardHeader>
                        <CardContent>
                             {salesData.length === 0 ? <EmptyState message="No hay ventas en el período seleccionado." icon={ShoppingCart} /> :
                            <ChartContainer config={salesConfig} className="min-h-[300px] w-full">
                                <BarChart data={salesData} layout="vertical">
                                    <CartesianGrid horizontal={false} />
                                    <YAxis dataKey="clientName" type="category" tickLine={false} tickMargin={10} axisLine={false} width={80} interval={0} />
                                    <XAxis type="number" />
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                    <Bar dataKey="totalSales" fill="var(--color-totalSales)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                             }
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Deudas por Cliente</CardTitle>
                            <CardDescription>Muestra la deuda pendiente de cada cliente en el período seleccionado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {salesData.filter(d => d.totalDebt > 0).length === 0 ? <EmptyState message="No hay deudas pendientes en el período seleccionado." icon={ShoppingCart} /> :
                            <ChartContainer config={salesConfig} className="min-h-[300px] w-full">
                                <PieChart>
                                  <ChartTooltip content={<ChartTooltipContent nameKey="clientName" />} />
                                    <Pie data={salesData.filter(d => d.totalDebt > 0)} dataKey="totalDebt" nameKey="clientName" cx="50%" cy="50%" outerRadius={100}>
                                        {salesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ChartContainer>
                            }
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </main>
    </div>
  );
}
