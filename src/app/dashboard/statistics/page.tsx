
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  CartesianGrid,
  YAxis,
  XAxis,
  Legend,
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
  eachDayOfInterval,
  eachMonthOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';

import type { Delivery, Provider } from '@/types';
import { ArrowLeft, BarChart3, Info, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { capitalize } from '@/lib/utils';

const EmptyState: React.FC<{ message: string; icon?: React.ElementType }> = ({ message, icon: Icon = Info }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md min-h-[300px]">
      <Icon className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Hay Datos Disponibles</p>
      <p className="text-sm">{message}</p>
    </div>
);

// Pre-defined color palette for the chart lines
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 40%, 80%)",
  "hsl(160, 60%, 70%)",
];

export default function StatisticsPage() {
    const [isClient, setIsClient] = useState(false);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    
    const [selectedProviderId, setSelectedProviderId] = useState<string>('all');
    const [timeRange, setTimeRange] = useState('month');

    useEffect(() => {
        setIsClient(true);
        if (typeof window !== 'undefined') {
            const storedDeliveries = localStorage.getItem('dailySupplyTrackerDeliveries');
            if (storedDeliveries) setDeliveries(JSON.parse(storedDeliveries));

            const storedProviders = localStorage.getItem('dailySupplyTrackerProviders');
            if (storedProviders) {
                const parsedProviders = JSON.parse(storedProviders);
                setProviders(parsedProviders);
            }
        }
    }, []);

    const chartConfig = useMemo(() => {
        const config: ChartConfig = {};
        providers.forEach((provider, index) => {
            config[provider.name] = {
                label: provider.name,
                color: COLORS[index % COLORS.length],
            };
        });
        // Add a generic 'quantity' for single provider view
        config.quantity = {
            label: "Cantidad",
            color: "hsl(var(--chart-1))"
        };
        return config;
    }, [providers]);

    const chartData = useMemo(() => {
        if (providers.length === 0) return [];
        
        const now = new Date();
        let interval: {start: Date, end: Date};
        
        switch (timeRange) {
            case 'week':
                interval = { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
                break;
            case 'month':
                interval = { start: startOfMonth(now), end: endOfMonth(now) };
                break;
            case 'year':
                interval = { start: startOfYear(now), end: endOfYear(now) };
                break;
            case 'all':
                if (deliveries.length === 0) return [];
                const allDates = deliveries.map(d => parseISO(d.date));
                interval = { start: new Date(Math.min(...allDates.map(d=>d.getTime()))), end: new Date(Math.max(...allDates.map(d=>d.getTime()))) };
                break;
            default:
                return [];
        }

        const dataGrouping = timeRange === 'year' || timeRange === 'all' ? 'month' : 'day';
        const intervalDates = dataGrouping === 'day' ? eachDayOfInterval(interval) : eachMonthOfInterval(interval);

        const getLabel = (d: Date) => {
            if (dataGrouping === 'day') {
                return timeRange === 'week' ? capitalize(format(d, 'EEEE', { locale: es })) : format(d, 'dd/MM');
            } else { // month
                return capitalize(format(d, timeRange === 'year' ? 'MMMM' : 'MMM yy', { locale: es }));
            }
        };

        if (selectedProviderId === 'all') {
            const dataMap = new Map<string, { date: string, [key: string]: number | string }>();
            
            // Initialize map with all possible dates/months in interval
            intervalDates.forEach(d => {
                const label = getLabel(d);
                if (!dataMap.has(label)) {
                    const initialEntry: { date: string, [key: string]: any } = { date: label };
                    providers.forEach(p => initialEntry[p.name] = 0);
                    dataMap.set(label, initialEntry);
                }
            });
    
            deliveries.forEach(delivery => {
                 if (isWithinInterval(parseISO(delivery.date), interval)) {
                    const label = getLabel(parseISO(delivery.date));
                    const entry = dataMap.get(label);
                    if (entry) {
                        entry[delivery.providerName] = (entry[delivery.providerName] as number || 0) + delivery.quantity;
                    }
                }
            });
    
            return Array.from(dataMap.values());
        } else {
            // Single provider logic
            const provider = providers.find(p => p.id === selectedProviderId);
            if (!provider) return [];
    
            const providerDeliveries = deliveries.filter(d => d.providerName === provider.name);
            const dataMap = new Map<string, number>();
    
            providerDeliveries.forEach(d => {
                 if (isWithinInterval(parseISO(d.date), interval)) {
                    const label = getLabel(parseISO(d.date));
                    dataMap.set(label, (dataMap.get(label) || 0) + d.quantity);
                }
            });
    
            return intervalDates.map(d => {
                const label = getLabel(d);
                return {
                    date: label,
                    quantity: dataMap.get(label) || 0,
                };
            });
        }
    }, [deliveries, providers, selectedProviderId, timeRange]);

    const hasData = useMemo(() => {
        return chartData.length > 0 && chartData.some(row => {
            // For 'all' providers, check if any provider has a value > 0
            if (selectedProviderId === 'all') {
                return Object.keys(row).some(key => key !== 'date' && (row[key as keyof typeof row] as number) > 0);
            }
            // For single provider, check if 'quantity' > 0
            return (row as { quantity: number }).quantity > 0;
        });
    }, [chartData, selectedProviderId]);


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
            <Card>
                <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                        <CardTitle>Entregas por Proveedor</CardTitle>
                        <CardDescription>Análisis de la cantidad de materia prima recibida. Selecciona un proveedor o mira a todos juntos.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Select value={selectedProviderId ?? 'all'} onValueChange={setSelectedProviderId}>
                             <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Seleccionar Proveedor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los Proveedores</SelectItem>
                                {providers.length > 0 ? (
                                    providers.map(provider => (
                                        <SelectItem key={provider.id} value={provider.id}>
                                            {provider.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>No hay proveedores</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Seleccionar Rango" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Esta Semana</SelectItem>
                                <SelectItem value="month">Este Mes</SelectItem>
                                <SelectItem value="year">Este Año</SelectItem>
                                <SelectItem value="all">Todo el Historial</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                     {providers.length === 0 ? <EmptyState message="Necesitas registrar al menos un proveedor para ver estadísticas." icon={Users} /> :
                      !hasData ? <EmptyState message="No hay entregas para la selección actual." /> :
                        <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickLine={false} 
                                    tickMargin={10} 
                                    axisLine={false} 
                                />
                                <YAxis tickFormatter={(value) => `${value} L`}/>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                {selectedProviderId === 'all' ? (
                                    providers.map((provider) => (
                                        <Line
                                            key={provider.id}
                                            dataKey={provider.name}
                                            type="monotone"
                                            stroke={chartConfig[provider.name]?.color}
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    ))
                                ) : (
                                    <Line
                                        dataKey="quantity"
                                        name={providers.find(p => p.id === selectedProviderId)?.name || "Cantidad"}
                                        type="monotone"
                                        stroke={chartConfig.quantity?.color}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                )}
                            </LineChart>
                        </ChartContainer>
                    }
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
