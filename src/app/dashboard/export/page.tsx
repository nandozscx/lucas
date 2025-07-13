
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Printer } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Delivery, Provider, Production, Sale, Client, WholeMilkReplenishment } from '@/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, subDays, addDays, isWithinInterval, parseISO, startOfDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { capitalize } from '@/lib/utils';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const STORAGE_KEYS = {
  deliveries: 'dailySupplyTrackerDeliveries',
  providers: 'dailySupplyTrackerProviders',
  production: 'dailySupplyTrackerProduction',
  sales: 'dailySupplyTrackerSales',
  clients: 'dailySupplyTrackerClients',
  wholeMilkReplenishments: 'dailySupplyTrackerWholeMilkReplenishments',
};

type ReportOptions = {
  weeklySummary: boolean;
  providerTotals: boolean;
  productionHistory: boolean;
  stockUsage: boolean;
  clientSummary: boolean;
  deliveriesChart: boolean;
};

export default function ExportPage() {
  const [isClient, setIsClient] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [reportOptions, setReportOptions] = useState<ReportOptions>({
    weeklySummary: true,
    providerTotals: true,
    productionHistory: true,
    stockUsage: true,
    clientSummary: true,
    deliveriesChart: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePreviousWeek = () => setCurrentWeekStart(prev => subDays(prev, 7));
  const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));

  const weekTitle = `Semana del ${format(currentWeekStart, "dd/MM/yy")} al ${format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "dd/MM/yy")}`;

  const handleExport = async () => {
    const {
      deliveries, providers, production, sales, clients
    } = loadAllData();

    if (Object.values(reportOptions).every(o => !o)) {
      toast({ title: "Sin Selección", description: "Por favor, selecciona al menos una sección para exportar.", variant: "destructive" });
      return;
    }

    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
    const deliveriesForWeek = deliveries.filter(d => isWithinInterval(parseISO(d.date), { start: currentWeekStart, end: weekEnd }));
    const productionForWeek = production.filter(p => isWithinInterval(parseISO(p.date), { start: currentWeekStart, end: weekEnd }));
    const salesForWeek = sales.filter(s => isWithinInterval(parseISO(s.date), { start: currentWeekStart, end: weekEnd }));

    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 22;

    doc.setFontSize(18);
    doc.text('Reporte Semanal Personalizado', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(weekTitle, doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });
    yPos += 10;

    const checkYPos = (spaceNeeded: number) => {
        if (yPos + spaceNeeded > doc.internal.pageSize.getHeight() - 15) {
            doc.addPage();
            yPos = 15;
        }
    }

    if (reportOptions.weeklySummary) {
      doc.setFontSize(14);
      doc.text('Resumen Semanal', 14, yPos);
      yPos += 8;

      const totalRawMaterial = deliveriesForWeek.reduce((sum, d) => sum + d.quantity, 0);
      const totalUnitsProduced = productionForWeek.reduce((sum, p) => sum + p.producedUnits, 0);
      const validIndices = productionForWeek.filter(p => p.transformationIndex !== 0 && isFinite(p.transformationIndex));
      const avgTransformationIndex = validIndices.length > 0 ? validIndices.reduce((sum, p) => sum + p.transformationIndex, 0) / validIndices.length : 0;
      
      doc.setFontSize(10);
      doc.text(`- Materia prima recibida: ${totalRawMaterial.toFixed(2)} L`, 16, yPos);
      yPos += 6;
      doc.text(`- Unidades producidas: ${totalUnitsProduced} unidades`, 16, yPos);
      yPos += 6;
      doc.text(`- Índice de transformación promedio: ${avgTransformationIndex.toFixed(2)}%`, 16, yPos);
      yPos += 10;
    }

    if (reportOptions.providerTotals) {
      checkYPos(40);
      const providerTotals = buildProviderTotals(providers, deliveries, currentWeekStart);
      const lucioTotal = providerTotals.find(p => p.name.toLowerCase() === 'lucio')?.totalToPay || 0;
      const otherProvidersTotal = providerTotals.filter(p => p.name.toLowerCase() !== 'lucio').reduce((sum, p) => sum + p.totalToPay, 0);

      doc.autoTable({
        head: [['Proveedor', 'Cantidad', 'Precio', 'Total a Pagar']],
        body: providerTotals.map(p => [p.name, p.quantity.toFixed(2), `S/. ${p.price.toFixed(2)}`, `S/. ${p.totalToPay.toFixed(2)}`]),
        startY: yPos,
        didDrawPage: (data) => { yPos = data.cursor?.y || yPos; },
        headStyles: { fillColor: [63, 81, 181] },
        foot: [
            ['', '', 'Total (Lucio):', `S/. ${lucioTotal.toFixed(2)}`],
            ['', '', 'Total (Otros):', `S/. ${otherProvidersTotal.toFixed(2)}`],
        ],
        footStyles: { fontStyle: 'bold' }
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    if (reportOptions.productionHistory) {
      checkYPos(40);
      doc.autoTable({
        head: [['Fecha', 'Materia Prima Total', 'Unidades Prod.', 'Índice']],
        body: productionForWeek.map(p => [
            capitalize(format(parseISO(p.date), 'EEEE, dd/MM', { locale: es })),
            `${(p.rawMaterialLiters + (p.wholeMilkKilos * 10)).toFixed(2)} L`,
            p.producedUnits,
            `${p.transformationIndex.toFixed(2)}%`
        ]),
        startY: yPos,
        didDrawPage: (data) => { yPos = data.cursor?.y || yPos; },
        headStyles: { fillColor: [76, 175, 80] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportOptions.stockUsage) {
      checkYPos(30);
      const stockUsageHistory = productionForWeek.filter(p => p.wholeMilkKilos > 0);
      doc.autoTable({
        head: [['Fecha de Uso', 'Kilos Usados']],
        body: stockUsageHistory.map(p => [
            capitalize(format(parseISO(p.date), 'EEE, dd/MM', { locale: es })),
            `${p.wholeMilkKilos.toFixed(2)} kg`
        ]),
        startY: yPos,
        didDrawPage: (data) => { yPos = data.cursor?.y || yPos; },
        headStyles: { fillColor: [156, 39, 176] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportOptions.clientSummary) {
        checkYPos(40);
        const clientSummary = buildClientSummary(clients, salesForWeek);
        doc.autoTable({
            head: [['Cliente', 'T. Comprado', 'T. Pagado', 'Deuda']],
            body: clientSummary.map(c => [
                c.name,
                `S/. ${c.totalBought.toFixed(2)}`,
                `S/. ${c.totalPaid.toFixed(2)}`,
                `S/. ${c.debt.toFixed(2)}`
            ]),
            startY: yPos,
            didDrawPage: (data) => { yPos = data.cursor?.y || yPos; },
            headStyles: { fillColor: [33, 150, 243] }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    doc.save(`reporte_personalizado_${format(currentWeekStart, 'yyyy-MM-dd')}.pdf`);
    toast({ title: "Exportación Exitosa", description: "El reporte personalizado se ha guardado como PDF." });
  };
  
  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6 space-y-6 bg-background">
        <header className="flex items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow flex justify-center items-center">
            <Skeleton className="w-full max-w-2xl h-96" />
        </main>
      </div>
    );
  }

  const options = [
    { id: 'weeklySummary', label: 'Resumen Semanal de Operaciones' },
    { id: 'providerTotals', label: 'Totales por Proveedor' },
    { id: 'productionHistory', label: 'Historial de Producción' },
    { id: 'stockUsage', label: 'Uso de Leche Entera' },
    { id: 'clientSummary', label: 'Resumen Semanal de Clientes' },
    { id: 'deliveriesChart', label: 'Gráfico de Entregas (Visual)' },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg gap-4">
        <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al Panel
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          <Printer className="mr-3 h-8 w-8" />
          Exportar y Imprimir
        </h1>
        <div className="w-0 sm:w-auto"></div>
      </header>

      <main className="flex-grow flex justify-center items-start p-4">
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Generador de Reportes</CardTitle>
                <CardDescription>Selecciona las secciones que deseas incluir en tu reporte PDF para la semana:</CardDescription>
                <div className="flex justify-between items-center pt-4">
                    <CardDescription>{weekTitle}</CardDescription>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {options.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={option.id}
                                checked={reportOptions[option.id as keyof ReportOptions]}
                                onCheckedChange={(checked) => {
                                    setReportOptions(prev => ({ ...prev, [option.id]: !!checked }))
                                }}
                            />
                            <Label htmlFor={option.id} className="text-sm font-medium leading-none cursor-pointer">
                                {option.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleExport} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Generar y Descargar PDF
                </Button>
            </CardFooter>
        </Card>
      </main>
      
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

// Helper functions for data processing
const loadAllData = () => {
    return {
      deliveries: JSON.parse(localStorage.getItem(STORAGE_KEYS.deliveries) || '[]') as Delivery[],
      providers: JSON.parse(localStorage.getItem(STORAGE_KEYS.providers) || '[]') as Provider[],
      production: JSON.parse(localStorage.getItem(STORAGE_KEYS.production) || '[]') as Production[],
      sales: JSON.parse(localStorage.getItem(STORAGE_KEYS.sales) || '[]') as Sale[],
      clients: JSON.parse(localStorage.getItem(STORAGE_KEYS.clients) || '[]') as Client[],
      wholeMilkReplenishments: JSON.parse(localStorage.getItem(STORAGE_KEYS.wholeMilkReplenishments) || '[]') as WholeMilkReplenishment[],
    };
};

const buildProviderTotals = (allProviders: Provider[], allDeliveries: Delivery[], weekStart: Date) => {
    // Standard week cycle (Sunday to Saturday)
    const standardWeekStart = startOfWeek(weekStart, { weekStartsOn: 0 });
    const standardWeekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

    // Lucio's week cycle (Saturday to Friday)
    const lucioWeekStart = startOfWeek(weekStart, { weekStartsOn: 6 });
    const lucioWeekEnd = endOfWeek(weekStart, { weekStartsOn: 6 });

    const providerTotals = allProviders.map(provider => {
        const isLucio = provider.name.toLowerCase() === 'lucio';
        const cycle = isLucio ? { start: lucioWeekStart, end: lucioWeekEnd } : { start: standardWeekStart, end: standardWeekEnd };
        
        const deliveriesForProviderInCycle = allDeliveries.filter(d => {
            if (d.providerName !== provider.name) return false;
            const deliveryDate = parseISO(d.date);
            return isWithinInterval(deliveryDate, cycle);
        });

        const totalQuantity = deliveriesForProviderInCycle.reduce((sum, d) => sum + d.quantity, 0);

        return {
            name: provider.name,
            quantity: totalQuantity,
            price: provider.price,
            totalToPay: totalQuantity * provider.price,
        };
    });

    return providerTotals.filter(p => p.quantity > 0);
};


const buildClientSummary = (allClients: Client[], salesForWeek: Sale[]) => {
    const clientSummaryMap = allClients.reduce((acc, client) => {
        acc[client.id] = { name: client.name, totalBought: 0, totalPaid: 0 };
        return acc;
    }, {} as Record<string, { name: string, totalBought: number, totalPaid: number }>);

    salesForWeek.forEach(sale => {
        if (clientSummaryMap[sale.clientId]) {
            clientSummaryMap[sale.clientId].totalBought += sale.totalAmount;
            clientSummaryMap[sale.clientId].totalPaid += sale.payments.reduce((sum, p) => sum + p.amount, 0);
        }
    });

    return Object.values(clientSummaryMap)
      .map(client => ({
        ...client,
        debt: client.totalBought - client.totalPaid,
      }))
      .filter(c => c.totalBought > 0);
}
