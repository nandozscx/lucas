
"use client";

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from '@/components/ui/table';
import { ArrowLeft, Sparkles, TrendingUp, UserCheck, PackageCheck, Archive, Wallet, Milk, Download, FileText, ChevronLeft, ChevronRight, BarChartHorizontal } from 'lucide-react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import type { Delivery, Provider, Production, Sale, Client, WholeMilkReplenishment, WeeklyReportOutput } from '@/types';
import { startOfWeek, endOfWeek, subDays, isWithinInterval, parseISO, format, eachDayOfInterval, addDays } from 'date-fns';
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
  salesTrendData: {name: string, value: number}[];
  stockUsage: Production[];
  latestMilkPrice: number;
  avgTransformationIndex: number;
  topProviderName: string;
  topClientName: string;
};

type DialogDataType = {
  type: 'provider' | 'client' | 'sales' | 'stock';
  title: string;
  data: any;
};

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportDataBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [dialogData, setDialogData] = useState<DialogDataType | null>(null);
  const { toast } = useToast();

  const weekTitle = `Semana del ${format(currentWeekStart, "dd/MM/yy")} al ${format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "dd/MM/yy")}`;

  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subDays(prev, 7));
    setReportData(null); // Clear previous report
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
    setReportData(null); // Clear previous report
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReportData(null);

    try {
      const allDeliveries: Delivery[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.deliveries) || '[]');
      const allProviders: Provider[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.providers) || '[]');
      const allProduction: Production[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.production) || '[]');
      const allSales: Sale[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.sales) || '[]');
      const allClients: Client[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.clients) || '[]');
      const allWholeMilkReplenishments: WholeMilkReplenishment[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.wholeMilkReplenishments) || '[]');
      
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
      
      const deliveriesForWeek = allDeliveries.filter(d => isWithinInterval(parseISO(d.date), { start: currentWeekStart, end: weekEnd }));
      const productionForWeek = allProduction.filter(p => isWithinInterval(parseISO(p.date), { start: currentWeekStart, end: weekEnd }));
      const salesForWeek = allSales.filter(s => isWithinInterval(parseISO(s.date), { start: currentWeekStart, end: weekEnd }));
      
      const providerTotals = deliveriesForWeek.reduce((acc, d) => {
        acc[d.providerName] = (acc[d.providerName] || 0) + d.quantity;
        return acc;
      }, {} as Record<string, number>);
      const topProviderName = Object.keys(providerTotals).sort((a,b) => providerTotals[b] - providerTotals[a])[0] || "N/A";
      const topProviderTotal = providerTotals[topProviderName] || 0;

      const clientTotals = salesForWeek.reduce((acc, s) => {
        const client = allClients.find(c => c.id === s.clientId);
        const clientName = client ? client.name : s.clientName;
        acc[clientName] = (acc[clientName] || 0) + s.totalAmount;
        return acc;
      }, {} as Record<string, number>);
      const topClientName = Object.keys(clientTotals).sort((a,b) => clientTotals[b] - clientTotals[a])[0] || "N/A";
      const topClientTotal = clientTotals[topClientName] || 0;

      const totalReplenishedSacos = allWholeMilkReplenishments.reduce((sum, r) => sum + r.quantitySacos, 0);
      const totalUsedKilos = allProduction.reduce((sum, p) => sum + (p.wholeMilkKilos || 0), 0);
      const stockInSacos = totalReplenishedSacos - (totalUsedKilos / 25);

      const previousWeekStart = subDays(currentWeekStart, 7);
      const previousWeekEnd = subDays(weekEnd, 7);
      const previousWeekSales = allSales.filter(s => isWithinInterval(parseISO(s.date), { start: previousWeekStart, end: previousWeekEnd }));
      const currentWeekTotalSales = salesForWeek.reduce((sum, s) => sum + s.totalAmount, 0);
      const previousWeekTotalSales = previousWeekSales.reduce((sum, s) => sum + s.totalAmount, 0);
      
      let salesTrendPercentage = 0;
      if (previousWeekTotalSales > 0) {
        salesTrendPercentage = ((currentWeekTotalSales - previousWeekTotalSales) / previousWeekTotalSales) * 100;
      }

      const totalRawMaterial = deliveriesForWeek.reduce((sum, d) => sum + d.quantity, 0);
      const totalUnitsProduced = productionForWeek.reduce((sum, p) => sum + p.producedUnits, 0);
      const validIndices = productionForWeek.filter(p => p.transformationIndex !== 0 && isFinite(p.transformationIndex));
      const avgTransformationIndex = validIndices.length > 0 ? validIndices.reduce((sum, p) => sum + p.transformationIndex, 0) / validIndices.length : 0;
      
      const generatedReport: WeeklyReportOutput = {
        summary: `La semana se recibieron ${totalRawMaterial.toFixed(2)} L de materia prima y se produjeron ${totalUnitsProduced} unidades, con un índice de transformación promedio de ${avgTransformationIndex.toFixed(2)}%.`,
        topProviderSummary: `${topProviderName} fue el proveedor más destacado con ${topProviderTotal.toFixed(2)} L.`,
        topClientSummary: `${topClientName} fue el cliente principal con S/. ${topClientTotal.toFixed(2)} en ventas.`,
        stockStatusSummary: `Quedan ${stockInSacos.toFixed(2)} sacos restantes.`,
        salesTrendSummary: previousWeekTotalSales > 0 
          ? `Las ventas ${salesTrendPercentage >= 0 ? 'aumentaron' : 'disminuyeron'} un ${Math.abs(salesTrendPercentage).toFixed(2)}% con respecto a la semana anterior.`
          : "No hay datos de ventas de la semana anterior para comparar."
      };
      
      const topProviderDeliveries = deliveriesForWeek.filter(d => d.providerName === topProviderName);
      
      const topClientInfo = allClients.find(c => c.name === topClientName);
      const topClientSales = topClientInfo ? salesForWeek.filter(s => s.clientId === topClientInfo.id) : [];

      const sortedReplenishments = [...allWholeMilkReplenishments].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      const latestMilkPrice = sortedReplenishments.length > 0 ? sortedReplenishments[0].pricePerSaco : 0;

      setReportData({
        report: generatedReport,
        topProviderDeliveries,
        topClientSales,
        salesTrendData: [
            { name: 'Semana Anterior', value: previousWeekTotalSales },
            { name: 'Esta Semana', value: currentWeekTotalSales }
        ],
        stockUsage: productionForWeek.filter(p => p.wholeMilkKilos > 0),
        latestMilkPrice,
        avgTransformationIndex,
        topProviderName,
        topClientName,
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
          <Cpu className="mr-3 h-8 w-8" />
          Reporte AI
        </h1>
        <div className="w-0 sm:w-auto"></div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <CardTitle>Generador de Reportes de IA</CardTitle>
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
                  Generar Reporte con IA
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="w-full max-w-5xl mt-8">
            {isLoading && <LoadingSkeleton />}
            {reportData && <ReportDisplay data={reportData} setDialogData={setDialogData} />}
        </div>
      </main>
      
      {dialogData && (
        <ReportDialog
          isOpen={!!dialogData}
          onClose={() => setDialogData(null)}
          dialogData={dialogData}
        />
      )}
    </div>
  );
}


const ReportDisplay = ({ data, setDialogData }: { data: ReportDataBundle, setDialogData: (data: DialogDataType | null) => void }) => {
  const { report, topProviderDeliveries, topClientSales, salesTrendData, stockUsage, latestMilkPrice, avgTransformationIndex, topProviderName, topClientName } = data;

  const cardItems = [
    { 
      type: 'provider',
      title: 'Proveedor Destacado', 
      icon: PackageCheck, 
      color: 'text-green-500', 
      summary: report.topProviderSummary,
      data: { topProviderDeliveries, topProviderName }
    },
    { 
      type: 'client',
      title: 'Cliente Principal', 
      icon: UserCheck, 
      color: 'text-blue-500', 
      summary: report.topClientSummary,
      data: { topClientSales, topClientName }
    },
    { 
      type: 'sales',
      title: 'Tendencia de Ventas', 
      icon: TrendingUp, 
      color: 'text-yellow-500', 
      summary: report.salesTrendSummary,
      data: salesTrendData
    },
    { 
      type: 'stock',
      title: 'Estado del Stock (L. Entera)', 
      icon: Archive, 
      color: 'text-purple-500', 
      summary: report.stockStatusSummary,
      data: { stockUsage, latestMilkPrice, avgTransformationIndex }
    },
  ];

  return (
    <Card className="shadow-lg animate-in fade-in-50">
        <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary">
                <Sparkles className="mr-2 h-6 w-6" />
                Resumen de la Semana
            </CardTitle>
            <CardDescription>
                {report.summary}
            </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {cardItems.map((item) => {
              const Icon = item.icon;
              return(
                <button
                  key={item.title}
                  onClick={() => setDialogData({ type: item.type as DialogDataType['type'], title: item.title, data: item.data })}
                  className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <Icon className={`h-6 w-6 ${item.color} mt-1 flex-shrink-0`} />
                  <div>
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="text-muted-foreground">{item.summary}</p>
                  </div>
                </button>
              )
            })}
        </CardContent>
    </Card>
  );
}

const ReportDialog = ({ isOpen, onClose, dialogData }: { isOpen: boolean, onClose: () => void, dialogData: DialogDataType }) => {
  const { type, title, data } = dialogData;

  const renderContent = () => {
    switch (type) {
      case 'provider':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Cantidad (L)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topProviderDeliveries.length > 0 ? data.topProviderDeliveries.map((d: Delivery) => (
                <TableRow key={d.id}>
                  <TableCell>{capitalize(format(parseISO(d.date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                  <TableCell className="text-right">{d.quantity.toLocaleString()}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={2} className="text-center">No hay entregas registradas.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        );
      case 'client':
        const totalPaid = data.topClientSales.reduce((sum: number, sale: Sale) => sum + sale.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);
        const totalAmount = data.topClientSales.reduce((sum: number, sale: Sale) => sum + sale.totalAmount, 0);
        const debt = totalAmount - totalPaid;
        return (
          <div className="space-y-2">
            <div className="flex justify-between"><span>Total Comprado:</span> <span className="font-medium">S/. {totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
            <div className="flex justify-between"><span>Total Pagado:</span> <span className="font-medium text-green-500">S/. {totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
            <div className="flex justify-between"><span>Deuda de la Semana:</span> <span className="font-medium text-destructive">S/. {debt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
          </div>
        );
      case 'sales':
        return (
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                <Bar dataKey="value" name="Ventas" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'stock':
        const totalKilosUsed = data.stockUsage.reduce((sum: number, p: Production) => sum + p.wholeMilkKilos, 0);
        const costToReplenish = (totalKilosUsed / 25) * data.latestMilkPrice;
        return (
           <div className="space-y-4">
            <div className="flex justify-between text-sm"><span>Total Usado en la Semana:</span> <span className="font-medium">{totalKilosUsed.toLocaleString()} kg</span></div>
            <div className="flex justify-between text-sm"><span>Costo de Reposición (aprox):</span> <span className="font-medium">S/. {costToReplenish.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Kilos Usados</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.stockUsage.length > 0 ? data.stockUsage.map((p: Production) => (
                        <TableRow key={p.id}>
                            <TableCell>{capitalize(format(parseISO(p.date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                            <TableCell className="text-right">{p.wholeMilkKilos.toLocaleString()}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={2} className="text-center">No se usó leche entera esta semana.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
           </div>
        );
      default:
        return <p>No hay detalles disponibles.</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Detalles para la semana seleccionada.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
