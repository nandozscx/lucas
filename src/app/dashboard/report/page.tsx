
"use client";

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from '@/components/ui/table';
import { ArrowLeft, Sparkles, TrendingUp, UserCheck, PackageCheck, Archive, Wallet, Milk, Download, FileText } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

import type { Delivery, Provider, Production, Sale, Client, WholeMilkReplenishment, WeeklyReportOutput } from '@/types';
import { startOfWeek, endOfWeek, subDays, isWithinInterval, parseISO, format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { capitalize } from '@/lib/utils';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


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
  printableReportData: PrintableReportData;
};

type PrintableReportData = {
    weekTitle: string;
    providerTotals: any[];
    totalToPayLucio: number;
    totalToPayOthers: number;
    productionHistory: Production[];
    stockUsageHistory: Production[];
    chartData: any[];
    chartConfig: ChartConfig;
};


export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportDataBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const printableReportRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    const input = printableReportRef.current;
    if (!input) {
      toast({
        title: "Error",
        description: "No se pudo encontrar el contenido del reporte para exportar.",
        variant: "destructive"
      });
      return;
    }

    try {
        const canvas = await html2canvas(input, {
            scale: 2, // Higher scale for better quality
            useCORS: true
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let imgWidth = pdfWidth;
        let imgHeight = imgWidth / ratio;

        if (imgHeight > pdfHeight) {
            imgHeight = pdfHeight;
            imgWidth = imgHeight * ratio;
        }
        
        const xOffset = (pdfWidth - imgWidth) / 2;
        const yOffset = (pdfHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
        pdf.save(`reporte_semanal_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
         toast({
            title: "Exportación Exitosa",
            description: "El reporte detallado ha sido guardado como PDF."
        });
    } catch (error) {
        console.error("Error al exportar a PDF:", error);
        toast({
            title: "Error de Exportación",
            description: "Ocurrió un error al intentar generar el PDF.",
            variant: "destructive"
        });
    }
  };


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
        const client = allClients.find(c => c.id === s.clientId);
        const clientName = client ? client.name : s.clientName; // Fallback to stored name
        acc[clientName] = (acc[clientName] || 0) + s.totalAmount;
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
      const previousWeekStart = subDays(currentWeekStart, 7);
      const previousWeekEnd = subDays(currentWeekEnd, 7);
      const previousWeekSales = allSales.filter(s => isWithinInterval(parseISO(s.date), { start: previousWeekStart, end: previousWeekEnd }));
      const previousWeekTotalSales = previousWeekSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const currentWeekTotalSales = salesForWeek.reduce((sum, s) => sum + s.totalAmount, 0);

      if (previousWeekTotalSales > 0) {
        salesTrendPercentage = ((currentWeekTotalSales - previousWeekTotalSales) / previousWeekTotalSales) * 100;
      }

      // Summary data
      const totalRawMaterial = deliveriesForWeek.reduce((sum, d) => sum + d.quantity, 0);
      const totalUnitsProduced = productionForWeek.reduce((sum, p) => sum + p.producedUnits, 0);
      const validIndices = productionForWeek.filter(p => p.transformationIndex !== 0 && isFinite(p.transformationIndex));
      const avgTransformationIndex = validIndices.length > 0 ? validIndices.reduce((sum, p) => sum + p.transformationIndex, 0) / validIndices.length : 0;
      
      const salesHistoryForChart: { week: number, total: number }[] = [];
      for (let i = 4; i >= 1; i--) {
        const weekStart = subDays(currentWeekStart, 7 * i);
        const weekEnd = subDays(currentWeekEnd, 7 * i);
        const weeklySales = allSales.filter(s => isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd }));
        const total = weeklySales.reduce((sum, s) => sum + s.totalAmount, 0);
        salesHistoryForChart.push({ week: -i, total });
      }
      salesHistoryForChart.push({ week: 0, total: currentWeekTotalSales });


      // 3. Generate summaries with local code
      const generatedReport: WeeklyReportOutput = {
        summary: `Esta semana se recibieron ${totalRawMaterial.toFixed(2)} L de materia prima y se produjeron ${totalUnitsProduced} unidades, con un índice de transformación promedio de ${avgTransformationIndex.toFixed(2)}%.`,
        topProviderSummary: `${topProviderName} fue el proveedor más destacado con ${topProviderTotal.toFixed(2)} L.`,
        topClientSummary: `${topClientName} fue el cliente principal con S/. ${topClientTotal.toFixed(2)} en ventas.`,
        stockStatusSummary: `Quedan ${stockInSacos.toFixed(2)} sacos restantes.`,
        salesTrendSummary: previousWeekTotalSales > 0 
          ? `Las ventas ${salesTrendPercentage >= 0 ? 'aumentaron' : 'disminuyeron'} un ${Math.abs(salesTrendPercentage).toFixed(2)}% con respecto a la semana anterior.`
          : "No hay datos de ventas de la semana anterior para comparar."
      };
      
      // 4. Bundle data for the UI
      const topProviderDeliveries = deliveriesForWeek.filter(d => d.providerName === topProviderName);
      
      const topClientInfo = allClients.find(c => c.name === topClientName);
      const topClientSales = topClientInfo ? salesForWeek.filter(s => s.clientId === topClientInfo.id) : [];

      const sortedReplenishments = [...allWholeMilkReplenishments].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      const latestMilkPrice = sortedReplenishments.length > 0 ? sortedReplenishments[0].pricePerSaco : 0;

      // 5. Data for Printable Report
        const printableReportData = buildPrintableReportData(allProviders, deliveriesForWeek, productionForWeek, currentWeekStart);

      setReportData({
        report: generatedReport,
        topProviderDeliveries,
        topClientSales,
        salesHistory: salesHistoryForChart,
        stockUsage: productionForWeek.filter(p => p.wholeMilkKilos > 0),
        latestMilkPrice,
        avgTransformationIndex,
        topProviderName,
        topClientName,
        printableReportData
      });
      
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error al Generar Reporte",
        description: "Ocurrió un error al procesar los datos locales. Revisa la consola para más detalles.",
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
          <FileText className="mr-3 h-8 w-8" />
          Reporte Semanal
        </h1>
        <div className="flex items-center gap-2">
            {reportData && (
                 <Button onClick={handleExportPDF} variant="outline" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Detallado
                </Button>
            )}
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        <Card className="w-full max-w-4xl">
          <CardHeader className="text-center">
            <CardTitle>Generador de Reportes Semanales</CardTitle>
            <CardDescription>
              Haz clic en el botón para analizar los datos de la semana actual y generar un resumen ejecutivo y un reporte detallado.
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
            {reportData && (
                <div className="mt-8">
                    <PrintableReport ref={printableReportRef} data={reportData.printableReportData} />
                </div>
            )}
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
  
  const previousWeeksDeliveries = 0; // Placeholder for future enhancement

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
                <Sparkles className="mr-2 h-6 w-6" />
                Resumen de la Semana
            </CardTitle>
            <CardDescription>
                Análisis de la operación de esta semana. Haz clic en una tarjeta para ver más detalles.
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
                         <p className="text-xs text-muted-foreground text-center pt-2">Comparativa con semanas anteriores no disponible.</p>
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
                                        <TableCell>{capitalize(format(parseISO(sale.date), "EEEE, dd/MM", { locale: es }))}</TableCell>
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

// Function to prepare data for the printable report
const buildPrintableReportData = (allProviders: Provider[], deliveriesForWeek: Delivery[], productionForWeek: Production[], currentWeekStart: Date): PrintableReportData => {
    // Provider Totals
    const providerTotalsMap = allProviders.reduce((acc, provider) => {
        acc[provider.name] = { totalQuantity: 0, price: provider.price };
        return acc;
    }, {} as Record<string, { totalQuantity: number, price: number }>);

    deliveriesForWeek.forEach(d => {
        if (providerTotalsMap[d.providerName]) {
            providerTotalsMap[d.providerName].totalQuantity += d.quantity;
        }
    });

    const providerTotals = Object.entries(providerTotalsMap).map(([name, data]) => ({
        name,
        quantity: data.totalQuantity,
        price: data.price,
        totalToPay: data.totalQuantity * data.price,
    })).filter(p => p.quantity > 0);

    const totalToPayLucio = providerTotals.find(p => p.name.toLowerCase() === 'lucio')?.totalToPay || 0;
    const totalToPayOthers = providerTotals.filter(p => p.name.toLowerCase() !== 'lucio').reduce((sum, p) => sum + p.totalToPay, 0);

    // Stock Usage
    const stockUsageHistory = productionForWeek.filter(p => p.wholeMilkKilos > 0);

    // Chart Data
    const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    const chartConfig = allProviders.reduce((config, provider, index) => {
        config[provider.name] = {
            label: provider.name,
            color: COLORS[index % COLORS.length],
        };
        return config;
    }, {} as ChartConfig);

    const weekDays = eachDayOfInterval({start: currentWeekStart, end: endOfWeek(currentWeekStart, {weekStartsOn: 0})});
    const dataMap = new Map<string, { date: string, [key: string]: number | string }>();

    weekDays.forEach(d => {
        const label = capitalize(format(d, 'EEEE', { locale: es }));
        const initialEntry: { date: string, [key: string]: any } = { date: label };
        allProviders.forEach(p => initialEntry[p.name] = 0);
        dataMap.set(label, initialEntry);
    });

    deliveriesForWeek.forEach(delivery => {
        const label = capitalize(format(parseISO(delivery.date), 'EEEE', { locale: es }));
        const entry = dataMap.get(label);
        if (entry) {
            entry[delivery.providerName] = (entry[delivery.providerName] as number || 0) + delivery.quantity;
        }
    });

    return {
        weekTitle: `Semana del ${format(currentWeekStart, "dd 'de' MMMM", { locale: es })}`,
        providerTotals,
        totalToPayLucio,
        totalToPayOthers,
        productionHistory: productionForWeek.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
        stockUsageHistory: stockUsageHistory.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
        chartData: Array.from(dataMap.values()),
        chartConfig,
    };
};

// Printable Report Component
const PrintableReport = React.forwardRef<HTMLDivElement, { data: PrintableReportData }>(({ data }, ref) => {
    const { weekTitle, providerTotals, totalToPayLucio, totalToPayOthers, productionHistory, stockUsageHistory, chartData, chartConfig } = data;
    const hasProviderData = providerTotals.length > 0;
    const hasProductionData = productionHistory.length > 0;
    const hasStockUsageData = stockUsageHistory.length > 0;
    const hasChartData = chartData.some(row => Object.keys(row).some(key => key !== 'date' && (row[key as keyof typeof row] as number) > 0));

    return (
        <div ref={ref} className="bg-white text-black p-8 shadow-2xl printable-a4">
            <style jsx global>{`
                .printable-a4 {
                    width: 210mm;
                    min-height: 297mm;
                    margin: auto;
                    font-family: Arial, sans-serif;
                }
                .printable-a4 h2 {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #333;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 0.5rem;
                    margin-top: 1.5rem;
                    margin-bottom: 1rem;
                }
                .printable-a4 h1 {
                    font-size: 2rem;
                    font-weight: bold;
                    color: #111;
                    text-align: center;
                }
                 .printable-a4 table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.8rem;
                }
                .printable-a4 th, .printable-a4 td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                .printable-a4 th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .recharts-wrapper {
                    font-size: 12px;
                }
            `}</style>
            
            <header className="text-center mb-8">
                <h1 className="text-3xl font-bold">Reporte Semanal Detallado</h1>
                <p className="text-lg text-gray-600">{weekTitle}</p>
            </header>

            <section>
                <h2>Totales por Proveedor</h2>
                {hasProviderData ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proveedor</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead className="text-right">Precio</TableHead>
                                <TableHead className="text-right">Total a Pagar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {providerTotals.map(p => (
                                <TableRow key={p.name} className={p.name.toLowerCase() === 'lucio' ? 'font-bold' : ''}>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell className="text-right">{p.quantity.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">S/. {p.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">S/. {p.totalToPay.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFoot>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">Total a Pagar (Lucio):</TableCell>
                                <TableCell className="text-right font-bold">S/. {totalToPayLucio.toFixed(2)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">Total a Pagar (Otros):</TableCell>
                                <TableCell className="text-right font-bold">S/. {totalToPayOthers.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableFoot>
                    </Table>
                ) : <p className="text-gray-500">No hay datos de proveedores para esta semana.</p>}
            </section>
            
            <section>
                <h2>Historial de Producción</h2>
                {hasProductionData ? (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Materia Prima Total</TableHead>
                                <TableHead className="text-right">Unidades Prod.</TableHead>
                                <TableHead className="text-right">Índice</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productionHistory.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{capitalize(format(parseISO(p.date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                                    <TableCell className="text-right">{(p.rawMaterialLiters + (p.wholeMilkKilos * 10)).toFixed(2)} L</TableCell>
                                    <TableCell className="text-right">{p.producedUnits}</TableCell>
                                    <TableCell className={`text-right ${p.transformationIndex >= 0 ? 'text-green-600' : 'text-red-600'}`}>{p.transformationIndex.toFixed(2)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-gray-500">No hay datos de producción para esta semana.</p>}
            </section>

             <section>
                <h2>Uso de Leche Entera</h2>
                {hasStockUsageData ? (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha de Uso</TableHead>
                                <TableHead className="text-right">Kilos Usados</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stockUsageHistory.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell>{capitalize(format(parseISO(p.date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                                    <TableCell className="text-right">{p.wholeMilkKilos.toFixed(2)} kg</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-gray-500">No se usó leche entera esta semana.</p>}
            </section>

            <section>
                <h2>Gráfico de Entregas por Proveedor</h2>
                {hasChartData ? (
                    <div className="w-full h-[400px] mt-4">
                        <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}/>
                                    <Legend />
                                    {Object.keys(chartConfig).map(key => (
                                        <Line key={key} type="monotone" dataKey={key} stroke={chartConfig[key].color} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                ) : <p className="text-gray-500">No hay datos suficientes para mostrar el gráfico.</p>}
            </section>
        </div>
    );
});

PrintableReport.displayName = 'PrintableReport';
