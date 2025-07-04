"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  YAxis,
  XAxis,
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

const chartConfig = {
  quantity: { label: "Cantidad Entregada (L)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

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
    
    const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
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
                if (parsedProviders.length > 0) {
                    setSelectedProviderId(parsedProviders[0].id);
                }
            }
        }
    }, []);

    const chartData = useMemo(() => {
        if (!selectedProviderId || providers.length === 0) return [];
        
        const provider = providers.find(p => p.id === selectedProviderId);
        if (!provider) return [];

        const providerDeliveries = deliveries.filter(d => d.providerName === provider.name);
        
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
                if (providerDeliveries.length === 0) return [];
                const allDates = providerDeliveries.map(d => parseISO(d.date));
                interval = { start: new Date(Math.min(...allDates.map(d=>d.getTime()))), end: new Date(Math.max(...allDates.map(d=>d.getTime()))) };
                break;
            default:
                return [];
        }

        const dataGrouping = timeRange === 'year' || timeRange === 'all' ? 'month' : 'day';

        if (dataGrouping === 'day') {
            const dailyData = new Map<string, number>(); // Key: 'yyyy-MM-dd'
            
            providerDeliveries.forEach(d => {
                const key = format(parseISO(d.date), "yyyy-MM-dd");
                dailyData.set(key, (dailyData.get(key) || 0) + d.quantity);
            });

            const daysInInterval = eachDayOfInterval(interval);
            return daysInInterval.map(day => {
                const key = format(day, "yyyy-MM-dd");
                const label = format(day, timeRange === 'week' ? 'EEEE' : 'dd/MM', { locale: es });
                return { 
                    date: label.charAt(0).toUpperCase() + label.slice(1), 
                    quantity: dailyData.get(key) || 0 
                };
            });
        } else { // dataGrouping === 'month'
            const monthlyData = new Map<string, number>(); // Key: yyyy-MM
            const dateFormat = timeRange === 'all' ? 'MMM yy' : 'MMMM';

            providerDeliveries.forEach(d => {
                const key = format(parseISO(d.date), "yyyy-MM");
                monthlyData.set(key, (monthlyData.get(key) || 0) + d.quantity);
            });
            
            const monthsInInterval = eachMonthOfInterval(interval);
            return monthsInInterval.map(month => {
                const key = format(month, "yyyy-MM");
                const label = format(month, dateFormat, { locale: es });
                return {
                    date: label.charAt(0).toUpperCase() + label.slice(1),
                    quantity: monthlyData.get(key) || 0
                };
            });
        }
    }, [deliveries, providers, selectedProviderId, timeRange]);

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
                        <CardDescription>Análisis de la cantidad de materia prima recibida de un proveedor específico.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Select value={selectedProviderId ?? ''} onValueChange={setSelectedProviderId}>
                             <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Seleccionar Proveedor" />
                            </SelectTrigger>
                            <SelectContent>
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
                      !selectedProviderId ? <EmptyState message="Por favor, selecciona un proveedor para empezar." icon={Users} /> :
                      chartData.length === 0 || chartData.every(d => d.quantity === 0) ? <EmptyState message="No hay entregas para este proveedor en el período seleccionado." /> :
                        <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                            <BarChart data={chartData} accessibilityLayer>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="quantity" name="Cantidad" fill="var(--color-quantity)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    }
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
