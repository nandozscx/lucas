
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, File as FileIcon, Sheet, FileSpreadsheet, FileText as FileTextIcon, DatabaseBackup, Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Delivery } from '@/types';
import type jsPDF from 'jspdf';
import { format } from 'date-fns';

// Extend jsPDF with autoTable - this is a common way to handle plugins with jsPDF
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const STORAGE_KEYS = [
  'dailySupplyTrackerDeliveries',
  'dailySupplyTrackerProviders',
  'dailySupplyTrackerClients',
  'dailySupplyTrackerSales'
];

export default function ExportPage() {
  const [isClient, setIsClient] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [fileToRestore, setFileToRestore] = useState<File | null>(null);

  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  const getDeliveries = (): Delivery[] => {
    if (typeof window === 'undefined') return [];
    const storedDeliveriesData = localStorage.getItem('dailySupplyTrackerDeliveries');
    return storedDeliveriesData ? JSON.parse(storedDeliveriesData) : [];
  };

  const exportToCSV = (filename = "entregas_suministros.csv") => {
    const currentDeliveries = getDeliveries();

    if (currentDeliveries.length === 0) {
      toast({
        title: "Sin Datos",
        description: "No hay datos para exportar.",
        variant: "destructive",
      });
      return false;
    }

    const headers = "Proveedor,Fecha,Cantidad\n";
    const csvRows = currentDeliveries.map((d: Delivery) =>
      `"${d.providerName.replace(/"/g, '""')}","${d.date}",${d.quantity}`
    );
    const csvContent = headers + csvRows.join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }
    toast({
      title: "Exportación Fallida",
      description: "Tu navegador no soporta descargas directas.",
      variant: "destructive",
    });
    return false;
  };

  const exportToXLSX = async () => {
    const XLSX = await import('xlsx');
    const currentDeliveries = getDeliveries();
    if (currentDeliveries.length === 0) {
      toast({
        title: "Sin Datos",
        description: "No hay datos para exportar a Excel.",
        variant: "destructive",
      });
      return;
    }

    const worksheetData = currentDeliveries.map(d => ({
      Proveedor: d.providerName,
      Fecha: d.date,
      Cantidad: d.quantity,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entregas");
    XLSX.writeFile(workbook, "entregas_suministros.xlsx");
    toast({
      title: "Exportación Excel Exitosa",
      description: "Las entregas se han exportado a XLSX.",
    });
  };

  const exportToPDF = async () => {
    const currentDeliveries = getDeliveries();
    if (currentDeliveries.length === 0) {
      toast({
        title: "Sin Datos",
        description: "No hay datos para exportar a PDF.",
        variant: "destructive",
      });
      return;
    }

    const { default: jsPDFConstructor } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDFConstructor() as jsPDFWithAutoTable;
    doc.autoTable({
      head: [['Proveedor', 'Fecha', 'Cantidad']],
      body: currentDeliveries.map(d => [d.providerName, d.date, d.quantity]),
      startY: 20,
      didDrawPage: (data) => {
        doc.setFontSize(18);
        doc.text('Reporte de Entregas de Suministros', data.settings.margin.left, 15);
      }
    });
    doc.save('entregas_suministros.pdf');
    toast({
      title: "Exportación PDF Exitosa",
      description: "Las entregas se han exportado a PDF.",
    });
  };
  
  const handleBackup = () => {
    const backupData: { [key: string]: any } = {};
    let hasData = false;
    STORAGE_KEYS.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                backupData[key] = JSON.parse(data);
                hasData = true;
            } catch (e) {
                console.error(`Error parsing data from localStorage for key ${key}:`, e);
            }
        }
    });

    if (!hasData) {
        toast({
            title: "Sin Datos",
            description: "No hay datos en la aplicación para crear una copia de seguridad.",
            variant: "destructive",
        });
        return;
    }

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = format(new Date(), "yyyy-MM-dd");
    link.download = `acopiapp_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
     toast({
      title: "Copia de Seguridad Creada",
      description: "El archivo de respaldo se ha descargado exitosamente.",
    });
  };

  const triggerRestore = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileToRestore(file);
      setIsRestoreConfirmOpen(true);
    }
    // Reset file input to allow selecting the same file again
    event.target.value = '';
  };
  
  const confirmRestore = () => {
    if (!fileToRestore) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File content is not readable.");

        const data = JSON.parse(text);
        
        const requiredKeys = STORAGE_KEYS;
        const hasAllKeys = requiredKeys.every(key => data.hasOwnProperty(key));

        if (!hasAllKeys) {
          throw new Error("El archivo de respaldo está corrupto o no tiene el formato correcto.");
        }

        requiredKeys.forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
        });

        toast({
          title: "Restauración Exitosa",
          description: "Los datos se han restaurado. La página se recargará ahora.",
        });

        // Reload the page to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } catch (error: any) {
        toast({
          title: "Error de Restauración",
          description: error.message || "No se pudo procesar el archivo de respaldo.",
          variant: "destructive",
        });
      } finally {
        setIsRestoreConfirmOpen(false);
        setFileToRestore(null);
      }
    };
    reader.readAsText(fileToRestore);
  };


  const handleExportOptionClick = (format: 'csv' | 'sheets' | 'excel' | 'pdf' | 'backup' | 'restore') => {
    if (format === 'csv') {
      if(exportToCSV()) {
        toast({
          title: "Exportación CSV Exitosa",
          description: "Las entregas se han exportado a CSV.",
        });
      }
    } else if (format === 'sheets') {
      if(exportToCSV("entregas_para_sheets.csv")) {
         toast({
          title: "CSV Descargado para Sheets",
          description: "Archivo CSV descargado. Puedes importarlo manualmente en Google Sheets.",
        });
      }
    } else if (format === 'excel') {
      exportToXLSX();
    } else if (format === 'pdf') {
      exportToPDF();
    } else if (format === 'backup') {
        handleBackup();
    } else if (format === 'restore') {
        triggerRestore();
    } else {
      toast({
        title: "Formato Desconocido",
        description: `La exportación a ${format.toUpperCase()} aún no está implementada o no es reconocida.`,
        variant: "destructive"
      });
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 space-y-6 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 p-4 md:p-8 items-center">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="w-full rounded-lg aspect-square" />
          ))}
        </main>
        <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
          <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </footer>
      </div>
    );
  }

  const exportOptions = [
    { title: "Exportar a CSV", icon: FileIcon, action: () => handleExportOptionClick('csv') },
    { title: "Exportar a Google Sheets", icon: Sheet, action: () => handleExportOptionClick('sheets') },
    { title: "Exportar a Excel", icon: FileSpreadsheet, action: () => handleExportOptionClick('excel') },
    { title: "Exportar a PDF", icon: FileTextIcon, action: () => handleExportOptionClick('pdf') },
    { title: "Crear Copia de Seguridad", icon: DatabaseBackup, action: () => handleExportOptionClick('backup') },
    { title: "Restaurar Copia de Seguridad", icon: Upload, action: () => handleExportOptionClick('restore') },
  ];

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg gap-4">
        <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al Panel
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          Opciones de Exportación y Respaldo
        </h1>
        <div className="w-0 sm:w-auto"></div> {/* Spacer for alignment */}
      </header>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />

      <main className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 p-4 md:p-8 items-center">
        {exportOptions.map((item) => {
          const IconComponent = item.icon;
          return (
            <Card
              key={item.title}
              role="button"
              tabIndex={0}
              onClick={item.action}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.action(); } }}
              className="flex flex-col items-center justify-center p-4 hover:shadow-xl transition-all duration-200 ease-in-out cursor-pointer aspect-square rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-md"
              aria-label={item.title}
            >
              <IconComponent className="h-20 w-20 text-primary mb-3" strokeWidth={1.5} />
              <p className="text-lg font-semibold text-center text-foreground">{item.title}</p>
            </Card>
          );
        })}
      </main>
      
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {currentYear} acopiapp. Todos los derechos reservados.</p>
      </footer>

      <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar Restauración?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción reemplazará TODOS los datos actuales de la aplicación con los del archivo de respaldo.
              <br />
              <strong>Esta acción no se puede deshacer.</strong> ¿Estás seguro de que quieres continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsRestoreConfirmOpen(false); setFileToRestore(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} className="bg-destructive hover:bg-destructive/90">
              Sí, Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
