
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from '@/components/ui/table';
import { ArrowLeft, BrainCircuit, BotMessageSquare, Sparkles, TrendingUp, UserCheck, PackageCheck, Archive, Wallet, Milk } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { generateWeeklyReport } from '@/ai/flows/generate-weekly-report-flow';
import type { Delivery, Provider, Production, Sale, Client, WholeMilkReplenishment, WeeklyReportInput, WeeklyReportOutput } from '@/types';
import { startOfWeek, endOfWeek, subDays, isWithinInterval, parseISO, format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { capitalize } from '@/lib/utils';


const STORAGE_KEYS = {
  deliveries: 'dailySupplyTrackerDeliveries',
  providers: 'dailySupplyTrackerProviders',
  production: 'dailySupplyTrackerProduction',
  sales: 'dailySupplyTrackerSales',
  clients: 'dailySupplyTrackerClients',
  wholeMilkReplenishments: 'dailySupplyTrackerWholeMilkReplenishments',
};

type ReportDataBundle = {
  report: WeeklyReportOutput;
  topProviderDeliveries: Delivery[];
  topClientSales: Sale[];
  salesHistory: { week: number; total: number }[];
  stockUsage: Production[];
  latestMilkPrice: number;
  avgTransformationIndex: number;
  topProviderName: string;
  topClientName: string;
};

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportDataBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReportData(null);

    try {
      // 1. Get all data from localStorage
      const allDeliveries: Delivery[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.deliveries) || '[]');
      const allProviders: Provider[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.providers) || '[]');
      const allProduction: Production[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.production) || '[]');
      const allSales: Sale[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.sales) || '[]');
      const allClients: Client[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.clients) || '[]');
      const allWholeMilkReplenishments: WholeMilkReplenishment[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.wholeMilkReplenishments) || '[]');
      
      const now = new Date();
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 0 });
      
      // 2. Perform all calculations locally
      const deliveriesForWeek = allDeliveries.filter(d => isWithinInterval(parseISO(d.date), { start: currentWeekStart, end: currentWeekEnd }));
      const productionForWeek = allProduction.filter(p => isWithinInterval(parseISO(p.date), { start: currentWeekStart, end: currentWeekEnd }));
      const salesForWeek = allSales.filter(s => isWithinInterval(parseISO(s.date), { start: currentWeekStart, end: currentWeekEnd }));
      
      // Top Provider
      const providerTotals = deliveriesForWeek.reduce((acc, d) => {
        acc[d.providerName] = (acc[d.providerName] || 0) + d.quantity;
        return acc;
      }, {} as Record<string, number>);
      const topProviderName = Object.keys(providerTotals).sort((a,b) => providerTotals[b] - providerTotals[a])[0] || "N/A";
      const topProviderTotal = providerTotals[topProviderName] || 0;

      // Top Client
      const clientTotals = salesForWeek.reduce((acc, s) => {
        acc[s.clientName] = (acc[s.clientName] || 0) + s.totalAmount;
        return acc;
      }, {} as Record<string, number>);
      const topClientName = Object.keys(clientTotals).sort((a,b) => clientTotals[b] - clientTotals[a])[0] || "N/A";
      const topClientTotal = clientTotals[topClientName] || 0;

      // Stock Status
      const totalReplenishedSacos = allWholeMilkReplenishments.reduce((sum, r) => sum + r.quantitySacos, 0);
      const totalUsedKilos = allProduction.reduce((sum, p) => sum + (p.wholeMilkKilos || 0), 0);
      const stockInSacos = totalReplenishedSacos - (totalUsedKilos / 25);

      // Sales Trend
      let salesTrendPercentage = 0;
      const salesHistoryForChart: { week: number, total: number }[] = [];
      let previousWeeksSalesTotal = 0;
      let previousWeeksCount = 0;
      for (let i = 1; i <= 4; i++) {
        const weekStart = subDays(currentWeekStart, 7 * i);
        const weekEnd = subDays(currentWeekEnd, 7 * i);
        const weeklySales = allSales.filter(s => isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd }));
        const total = weeklySales.reduce((sum, s) => sum + s.totalAmount, 0);
        if (weeklySales.length > 0) {
            previousWeeksSalesTotal += total;
            previousWeeksCount++;
        }
        salesHistoryForChart.unshift({ week: -i, total });
      }
      const currentWeekTotalSales = salesForWeek.reduce((sum, s) => sum + s.totalAmount, 0);
      salesHistoryForChart.push({ week: 0, total: currentWeekTotalSales });

      const avgPreviousSales = previousWeeksCount > 0 ? previousWeeksSalesTotal / previousWeeksCount : 0;
      if (avgPreviousSales > 0) {
        salesTrendPercentage = ((currentWeekTotalSales - avgPreviousSales) / avgPreviousSales) * 100;
      }

      // Summary data
      const totalRawMaterial = deliveriesForWeek.reduce((sum, d) => sum + d.quantity, 0);
      const totalUnitsProduced = productionForWeek.reduce((sum, p) => sum + p.producedUnits, 0);
      const validIndices = productionForWeek.filter(p => p.transformationIndex !== 0);
      const avgTransformationIndex = validIndices.length > 0 ? validIndices.reduce((sum, p) => sum + p.transformationIndex, 0) / validIndices.length : 0;

      // 3. Prepare input for the AI flow with pre-calculated data
      const reportInput: WeeklyReportInput = {
        totalRawMaterial,
        totalUnitsProduced,
        avgTransformationIndex,
        topProviderName: topProviderName,
        topProviderTotal: topProviderTotal,
        topClientName: topClientName,
        topClientTotal: topClientTotal,
        stockInSacos,
        salesTrendPercentage,
        isTrendComparisonPossible: avgPreviousSales > 0,
      };

      const generatedReport = await generateWeeklyReport(reportInput);

      // 4. Bundle data for the UI
      const topProviderDeliveries = deliveriesForWeek.filter(d => d.providerName === topProviderName);
      const topClientSales = salesForWeek.filter(s => s.clientName === topClientName);
      
      const sortedReplenishments = [...allWholeMilkReplenishments].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      const latestMilkPrice = sortedReplenishments.length > 0 ? sortedReplenishments[0].pricePerSaco : 0;

      setReportData({
        report: generatedReport,
        topProviderDeliveries,
        topClientSales,
        salesHistory: salesHistoryForChart,
        stockUsage: productionForWeek.filter(p => p.wholeMilkKilos > 0),
        latestMilkPrice,
        avgTransformationIndex,
        topProviderName,
        topClientName
      });
      
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
            {reportData && <ReportDisplay data={reportData} />}
        </div>
      </main>
    </div>
  );
}


const ReportDisplay = ({ data }: { data: ReportDataBundle }) => {
  const { report, topProviderDeliveries, topClientSales, salesHistory, stockUsage, latestMilkPrice, avgTransformationIndex, topProviderName, topClientName } = data;

  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({start: currentWeekStart, end: endOfWeek(now, {weekStartsOn: 0})});

  // Top Provider Dialog Data
  const providerDailyData = weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const total = topProviderDeliveries
          .filter(d => d.date === dateStr)
          .reduce((sum, d) => sum + d.quantity, 0);
      return { date: day, total };
  });
  const providerTotal = providerDailyData.reduce((sum, d) => sum + d.total, 0);
  const avgPrevious4Weeks = salesHistory.slice(0, 4).reduce((sum, s) => sum + s.total, 0) / 4;

  // Top Client Dialog Data
  const clientTotalSales = topClientSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const clientTotalPaid = topClientSales.reduce((sum, sale) => sum + sale.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);

  // Sales Trend Dialog Data
  const salesChartData = salesHistory.map(item => ({
    name: item.week === 0 ? 'Esta Semana' : `Semana ${item.week}`,
    Ventas: item.total
  }));

  // Stock Status Dialog Data
  const totalKilosUsed = stockUsage.reduce((sum, p) => sum + (p.wholeMilkKilos || 0), 0);
  const costToReplenish = (totalKilosUsed / 25) * latestMilkPrice;
  const profitFromMilk = costToReplenish * (avgTransformationIndex / 100);

  return (
    <Card className="shadow-lg animate-in fade-in-50">
        <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary">
                <BotMessageSquare className="mr-2 h-6 w-6" />
                Reporte Semanal Inteligente
            </CardTitle>
            <CardDescription>
                Análisis automático de la operación de esta semana. Haz clic en una tarjeta para ver más detalles.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
            <p className="italic text-muted-foreground">{report.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Top Provider */}
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                            <PackageCheck className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Proveedor Destacado</h4>
                                <p className="text-muted-foreground">{report.topProviderSummary}</p>
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center"><PackageCheck className="mr-2 h-5 w-5 text-green-500"/>Detalle de Entregas: {topProviderName}</DialogTitle>
                            <DialogDescription>Resumen de entregas para la semana actual.</DialogDescription>
                        </DialogHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Día</TableHead>
                                    <TableHead className="text-right">Litros Entregados</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {providerDailyData.map(d => (
                                    <TableRow key={d.date.toISOString()}>
                                        <TableCell>{capitalize(format(d.date, "EEEE", {locale: es}))}</TableCell>
                                        <TableCell className="text-right">{d.total > 0 ? d.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFoot>
                                <TableRow>
                                    <TableCell className="font-bold">Total Semanal</TableCell>
                                    <TableCell className="text-right font-bold">{providerTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} L</TableCell>
                                </TableRow>
                            </TableFoot>
                        </Table>
                         <p className="text-xs text-muted-foreground text-center pt-2">Promedio de las últimas 4 semanas: {avgPrevious4Weeks.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} L</p>
                    </DialogContent>
                </Dialog>

                {/* Top Client */}
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                            <UserCheck className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Cliente Principal</h4>
                                <p className="text-muted-foreground">{report.topClientSummary}</p>
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5 text-blue-500"/>Detalle de Compras: {topClientName}</DialogTitle>
                             <DialogDescription>Resumen de compras y pagos para la semana actual.</DialogDescription>
                        </DialogHeader>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead className="text-right">Monto Venta</TableHead>
                                    <TableHead className="text-right">Pagos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topClientSales.map(sale => (
                                    <TableRow key={sale.id}>
                                        <TableCell>{capitalize(format(parseISO(sale.date), "EEEE, dd/MM", {locale: es}))}</TableCell>
                                        <TableCell className="text-right">S/. {sale.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                        <TableCell className="text-right">S/. {sale.payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFoot>
                                <TableRow>
                                    <TableCell className="font-bold">Total</TableCell>
                                    <TableCell className="text-right font-bold">S/. {clientTotalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                    <TableCell className="text-right font-bold text-green-500">S/. {clientTotalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                </TableRow>
                            </TableFoot>
                        </Table>
                    </DialogContent>
                </Dialog>
                
                {/* Sales Trend */}
                <Dialog>
                    <DialogTrigger asChild>
                       <div className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                            <TrendingUp className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Tendencia de Ventas</h4>
                                <p className="text-muted-foreground">{report.salesTrendSummary}</p>
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-yellow-500"/>Evolución de Ventas Semanales</DialogTitle>
                        </DialogHeader>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))',
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="Ventas" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Stock Status */}
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                            <Archive className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold">Estado del Stock (L. Entera)</h4>
                                <p className="text-muted-foreground">{report.stockStatusSummary}</p>
                            </div>
                        </div>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center"><Archive className="mr-2 h-5 w-5 text-purple-500"/>Análisis de Stock de Leche Entera</DialogTitle>
                            <DialogDescription>Movimientos de la semana actual.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center"><Milk className="mr-2 h-4 w-4"/>Uso Total en la Semana:</span>
                                <span className="font-bold">{totalKilosUsed.toLocaleString()} kg</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center"><Wallet className="mr-2 h-4 w-4"/>Costo de Reposición:</span>
                                <span className="font-bold text-destructive">S/. {costToReplenish.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center"><TrendingUp className="mr-2 h-4 w-4"/>Ganancia Estimada por Uso:</span>
                                <span className="font-bold text-green-500">S/. {profitFromMilk.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        </div>
                         <DialogFooter>
                            <p className="text-xs text-muted-foreground w-full text-center">La ganancia se estima como: costo de reposición × índice de transformación promedio.</p>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </CardContent>
    </Card>
  );
}
