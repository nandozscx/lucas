"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BrainCircuit, BotMessageSquare, Sparkles, TrendingUp, UserCheck, PackageCheck, Archive } from 'lucide-react';
import { generateWeeklyReport } from '@/ai/flows/generate-weekly-report-flow';
import type { Delivery, Provider, Production, Sale, WholeMilkReplenishment, WeeklyReportInput, WeeklyReportOutput } from '@/types';
import { startOfWeek, endOfWeek, subDays, isWithinInterval, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEYS = {
  deliveries: 'dailySupplyTrackerDeliveries',
  providers: 'dailySupplyTrackerProviders',
  production: 'dailySupplyTrackerProduction',
  sales: 'dailySupplyTrackerSales',
  clients: 'dailySupplyTrackerClients',
  wholeMilkReplenishments: 'dailySupplyTrackerWholeMilkReplenishments',
};

export default function ReportPage() {
  const [report, setReport] = useState<WeeklyReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReport(null);

    try {
      // 1. Get all data from localStorage
      const allDeliveries: Delivery[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.deliveries) || '[]');
      const allProviders: Provider[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.providers) || '[]');
      const allProduction: Production[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.production) || '[]');
      const allSales: Sale[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.sales) || '[]');
      const allWholeMilkReplenishments: WholeMilkReplenishment[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.wholeMilkReplenishments) || '[]');

      // 2. Define date ranges for current and previous week
      const now = new Date();
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 0 });
      const previousWeekStart = subDays(currentWeekStart, 7);
      const previousWeekEnd = subDays(currentWeekEnd, 7);
      
      // 3. Filter data for the relevant periods
      const deliveriesForWeek = allDeliveries.filter(d => isWithinInterval(parseISO(d.date), { start: currentWeekStart, end: currentWeekEnd }));
      const productionForWeek = allProduction.filter(p => isWithinInterval(parseISO(p.date), { start: currentWeekStart, end: currentWeekEnd }));
      const salesForWeek = allSales.filter(s => isWithinInterval(parseISO(s.date), { start: currentWeekStart, end: currentWeekEnd }));
      const salesForPreviousWeek = allSales.filter(s => isWithinInterval(parseISO(s.date), { start: previousWeekStart, end: previousWeekEnd }));

      // 4. Prepare input for the AI flow
      const reportInput: WeeklyReportInput = {
        deliveries: deliveriesForWeek.map(d => ({...d})),
        providers: allProviders.map(p => ({...p})),
        production: allProduction.map(p => ({...p})), // Pass all production for stock calculation
        sales: salesForWeek.map(s => ({...s, payments: s.payments.map(p => ({...p}))})),
        wholeMilkReplenishments: allWholeMilkReplenishments.map(w => ({...w})),
        previousWeekSales: salesForPreviousWeek.map(s => ({...s, payments: s.payments.map(p => ({...p}))})),
      };

      // 5. Call the AI flow
      const generatedReport = await generateWeeklyReport(reportInput);
      setReport(generatedReport);
      
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error al Generar Reporte",
        description: "No se pudo conectar con el servicio de IA. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ReportDisplay = ({ reportData }: { reportData: WeeklyReportOutput }) => (
    <Card className="shadow-lg animate-in fade-in-50">
        <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary">
                <BotMessageSquare className="mr-2 h-6 w-6" />
                Reporte Semanal Inteligente
            </CardTitle>
            <CardDescription>
                Análisis automático de la operación de esta semana.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
            <p className="italic text-muted-foreground">{reportData.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 rounded-lg border p-3">
                    <PackageCheck className="h-6 w-6 text-green-500 mt-1" />
                    <div>
                        <h4 className="font-semibold">Proveedor Destacado</h4>
                        <p className="text-muted-foreground">{reportData.topProvider}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                    <UserCheck className="h-6 w-6 text-blue-500 mt-1" />
                    <div>
                        <h4 className="font-semibold">Cliente Principal</h4>
                        <p className="text-muted-foreground">{reportData.topClient}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                    <TrendingUp className="h-6 w-6 text-yellow-500 mt-1" />
                    <div>
                        <h4 className="font-semibold">Tendencia de Ventas</h4>
                        <p className="text-muted-foreground">{reportData.salesTrend}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border p-3">
                    <Archive className="h-6 w-6 text-purple-500 mt-1" />
                    <div>
                        <h4 className="font-semibold">Estado del Stock</h4>
                        <p className="text-muted-foreground">{reportData.stockStatus}</p>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
  );
  
  const LoadingSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
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
          <BrainCircuit className="mr-3 h-8 w-8" />
          Reporte con IA
        </h1>
        <div className="w-0 sm:w-auto"></div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <CardTitle>Generador de Reportes Semanales</CardTitle>
            <CardDescription>
              Haz clic en el botón para que la inteligencia artificial analice los datos de la semana actual y genere un resumen ejecutivo.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={handleGenerateReport} disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Analizando Datos...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar Reporte de la Semana
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="w-full max-w-4xl mt-8">
            {isLoading && <LoadingSkeleton />}
            {report && <ReportDisplay reportData={report} />}
        </div>
      </main>
    </div>
  );
}
