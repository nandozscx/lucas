"use client";
import Link from "next/link";
import React, { useRef } from 'react';
import { ArrowLeft, DatabaseBackup, Download, FileUp, AlertTriangle } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
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

const STORAGE_KEYS = {
  deliveries: 'dailySupplyTrackerDeliveries',
  providers: 'dailySupplyTrackerProviders',
  production: 'dailySupplyTrackerProduction',
  wholeMilkReplenishments: 'dailySupplyTrackerWholeMilkReplenishments',
  clients: 'dailySupplyTrackerClients',
  sales: 'dailySupplyTrackerSales',
};

export default function BackupPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileToRestore, setFileToRestore] = React.useState<File | null>(null);

  const handleBackup = () => {
    try {
      const backupData: Record<string, any> = {};
      
      for (const key in STORAGE_KEYS) {
        const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
        const data = localStorage.getItem(storageKey);
        backupData[key] = data ? JSON.parse(data) : [];
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `acopiapp_backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Respaldo Creado",
        description: "Todos los datos de la aplicación han sido guardados en tu dispositivo.",
      });

    } catch (error) {
      console.error("Error al crear el respaldo:", error);
      toast({
        title: "Error de Respaldo",
        description: "No se pudo crear el archivo de respaldo. Revisa la consola para más detalles.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json') {
        setFileToRestore(file);
      } else {
        toast({
          title: "Archivo Inválido",
          description: "Por favor, selecciona un archivo de respaldo con formato .json.",
          variant: "destructive",
        });
      }
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
        if (typeof text !== 'string') {
          throw new Error("El contenido del archivo no es válido.");
        }
        const restoredData = JSON.parse(text);
        
        // Validate the structure of the backup file
        const backupKeys = Object.keys(STORAGE_KEYS);
        const restoredKeys = Object.keys(restoredData);
        const hasAllKeys = backupKeys.every(key => restoredKeys.includes(key));
        
        if (!hasAllKeys) {
            throw new Error("El archivo de respaldo está incompleto o corrupto.");
        }

        // Clear existing data and restore from backup
        for (const key in STORAGE_KEYS) {
            const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
            const dataToStore = restoredData[key];
            if (Array.isArray(dataToStore)) {
                localStorage.setItem(storageKey, JSON.stringify(dataToStore));
            } else {
                console.warn(`Dato inválido para la llave "${key}" en el archivo de respaldo. Se omitió.`);
            }
        }
        
        toast({
            title: "Datos Restaurados",
            description: "Los datos han sido restaurados exitosamente. La aplicación se recargará.",
        });

        // Reload the application to reflect the new state everywhere
        setTimeout(() => {
            window.location.reload();
        }, 1500);

      } catch (error) {
        console.error("Error al restaurar los datos:", error);
        toast({
          title: "Error de Restauración",
          description: (error as Error).message || "No se pudo leer el archivo de respaldo. Asegúrate de que no esté dañado.",
          variant: "destructive",
        });
      } finally {
        setFileToRestore(null);
      }
    };
    reader.onerror = () => {
        toast({
            title: "Error de Lectura",
            description: "No se pudo leer el archivo seleccionado.",
            variant: "destructive",
        });
        setFileToRestore(null);
    };
    reader.readAsText(fileToRestore);
  };
  
  return (
    <>
      <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
          <header className="flex flex-col sm:flex-row items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg gap-4">
              <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Volver al Panel
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
                  <DatabaseBackup className="mr-3 h-8 w-8" />
                  Salvar y Leer Datos
              </h1>
              <div className="w-0 sm:w-auto"></div>
          </header>
          <main className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 items-start p-4">
              <Card>
                  <CardHeader>
                      <CardTitle>Salvar Datos (Respaldo)</CardTitle>
                      <CardDescription>
                          Crea una copia de seguridad de todos tus datos (proveedores, entregas, producción, clientes y ventas) en un solo archivo. Guarda este archivo en un lugar seguro.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <p className="text-sm text-muted-foreground">
                          Esto generará un archivo `.json` que contiene toda la información registrada en la aplicación hasta este momento.
                      </p>
                  </CardContent>
                  <CardFooter>
                      <Button onClick={handleBackup} className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Descargar Archivo de Respaldo
                      </Button>
                  </CardFooter>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Leer Datos (Restaurar)</CardTitle>
                      <CardDescription>
                          Reemplaza todos los datos actuales de la aplicación con la información de un archivo de respaldo que hayas guardado previamente.
                      </CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>¡Atención!</AlertTitle>
                          <AlertDescription>
                              Esta acción es irreversible. Todos los datos que no hayas guardado en un respaldo se perderán para siempre.
                          </AlertDescription>
                      </Alert>
                      <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileSelect} 
                          accept="application/json"
                          className="hidden"
                      />
                  </CardContent>
                  <CardFooter>
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
                          <FileUp className="mr-2 h-4 w-4" />
                          Seleccionar Archivo y Restaurar
                      </Button>
                  </CardFooter>
              </Card>
          </main>
      </div>

      <AlertDialog open={!!fileToRestore} onOpenChange={(open) => !open && setFileToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas la restauración?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de reemplazar todos los datos de la aplicación con el contenido de <strong>{fileToRestore?.name}</strong>.
              Esta acción no se puede deshacer. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFileToRestore(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>
              Sí, restaurar datos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
