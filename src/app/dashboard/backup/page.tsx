
"use client";
import Link from "next/link";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, DatabaseBackup, Download, FileUp, AlertTriangle, FolderSync, UploadCloud, Trash2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { get, set, del } from 'idb-keyval'; // Simple IndexedDB wrapper
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Types ---
type BackupFile = {
  handle: FileSystemFileHandle;
  name: string;
  lastModified: number;
};

// --- Constants ---
const STORAGE_KEYS = {
  deliveries: 'dailySupplyTrackerDeliveries',
  providers: 'dailySupplyTrackerProviders',
  production: 'dailySupplyTrackerProduction',
  wholeMilkReplenishments: 'dailySupplyTrackerWholeMilkReplenishments',
  clients: 'dailySupplyTrackerClients',
  sales: 'dailySupplyTrackerSales',
};
const BACKUP_DIR_HANDLE_KEY = 'backupDirectoryHandle';
const BACKUP_FILE_PREFIX = 'acopiapp_backup_';

// --- Main Component ---
export default function BackupPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isApiSupported, setIsApiSupported] = useState(false);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<BackupFile | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [fileToRestore, setFileToRestore] = useState<File | null>(null); // For legacy restore

  // --- Effects ---
  useEffect(() => {
    if ('showDirectoryPicker' in window) {
      setIsApiSupported(true);
    }
  }, []);

  useEffect(() => {
    const loadDirHandle = async () => {
      try {
        const handle = await get<FileSystemDirectoryHandle>(BACKUP_DIR_HANDLE_KEY);
        if (handle) {
          const permission = await handle.queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            setDirHandle(handle);
          } else {
             del(BACKUP_DIR_HANDLE_KEY); // Clear stale handle if permission is lost
          }
        }
      } catch (error) {
        console.error("Error loading directory handle from IndexedDB:", error);
      } finally {
        setIsLoadingFiles(false);
      }
    };
    if (isApiSupported) {
      loadDirHandle();
    } else {
      setIsLoadingFiles(false);
    }
  }, [isApiSupported]);
  
  const scanBackupFiles = useCallback(async (handle: FileSystemDirectoryHandle | null) => {
    if (!handle) return;
    setIsLoadingFiles(true);
    try {
      const files: BackupFile[] = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file' && entry.name.startsWith(BACKUP_FILE_PREFIX) && entry.name.endsWith('.json')) {
          const file = await entry.getFile();
          files.push({ handle: entry, name: entry.name, lastModified: file.lastModified });
        }
      }
      setBackupFiles(files.sort((a, b) => b.lastModified - a.lastModified));
    } catch (error) {
      console.error("Error scanning backup files:", error);
      toast({ title: "Error de Lectura", description: "No se pudo leer la carpeta de respaldos.", variant: "destructive" });
    } finally {
      setIsLoadingFiles(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (dirHandle) {
      scanBackupFiles(dirHandle);
    }
  }, [dirHandle, scanBackupFiles]);

  const requestAndSetDirHandle = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await handle.requestPermission({ mode: 'readwrite' });
      await set(BACKUP_DIR_HANDLE_KEY, handle);
      setDirHandle(handle);
      return handle;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Error selecting directory:", error);
        toast({ title: "Error", description: "No se pudo conectar a la carpeta.", variant: "destructive" });
      }
      return null;
    }
  };

  const handleBackup = async (currentHandle?: FileSystemDirectoryHandle | null) => {
    const handle = currentHandle || dirHandle;

    if (!handle) {
      const newHandle = await requestAndSetDirHandle();
      if (newHandle) {
        await handleBackup(newHandle); // Recurse with the new handle
      }
      return;
    }
    
    try {
      const backupData: Record<string, any> = {};
      for (const key in STORAGE_KEYS) {
        const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
        const data = localStorage.getItem(storageKey);
        backupData[key] = data ? JSON.parse(data) : [];
      }
      
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `${BACKUP_FILE_PREFIX}${date}.json`;
      const fileHandle = await handle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(backupData, null, 2));
      await writable.close();
      
      toast({
        title: "Respaldo Creado",
        description: `El archivo ${fileName} ha sido guardado en tu carpeta conectada.`,
      });
      scanBackupFiles(handle); // Refresh file list
      
    } catch (error) {
      console.error("Error al crear el respaldo:", error);
      toast({
        title: "Error de Respaldo",
        description: "No se pudo crear el archivo de respaldo. Revisa la consola para más detalles.",
        variant: "destructive",
      });
    }
  };

  // --- Handlers ---
  const handleConnectDirectory = async () => {
    const newHandle = await requestAndSetDirHandle();
    if(newHandle){
      toast({ title: "Carpeta Conectada", description: "Ahora puedes guardar y cargar respaldos desde esta ubicación." });
    }
  };
  
  const createLegacyBackup = () => {
    try {
      const backupData: Record<string, any> = {};
      for (const key in STORAGE_KEYS) {
        const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
        const data = localStorage.getItem(storageKey);
        backupData[key] = data ? JSON.parse(data) : [];
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `${BACKUP_FILE_PREFIX}${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Respaldo Descargado",
        description: `El archivo ${a.download} ha sido generado.`,
      });
    } catch (error) {
      console.error("Error al crear el respaldo de descarga:", error);
      toast({
        title: "Error de Respaldo",
        description: "No se pudo crear el archivo de respaldo.",
        variant: "destructive",
      });
    }
  };


  const confirmRestore = async () => {
    const fileToProcess = fileToRestore || (selectedFile ? await selectedFile.handle.getFile() : null);
    if (!fileToProcess) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("El contenido del archivo no es válido.");
        
        const restoredData = JSON.parse(text);
        
        const backupKeys = Object.keys(STORAGE_KEYS);
        const restoredKeys = Object.keys(restoredData);
        if (!backupKeys.every(key => restoredKeys.includes(key))) {
            throw new Error("El archivo de respaldo está incompleto o corrupto.");
        }

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

        setTimeout(() => window.location.reload(), 1500);

      } catch (error) {
        console.error("Error al restaurar los datos:", error);
        toast({
          title: "Error de Restauración",
          description: (error as Error).message || "No se pudo leer el archivo de respaldo.",
          variant: "destructive",
        });
      } finally {
        setSelectedFile(null);
        setFileToRestore(null);
      }
    };
    reader.onerror = () => {
        toast({ title: "Error de Lectura", description: "No se pudo leer el archivo.", variant: "destructive" });
        setSelectedFile(null);
        setFileToRestore(null);
    };
    reader.readAsText(fileToProcess);
  };
  
  const handleFileSelectForLegacyRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json') {
        setFileToRestore(file);
      } else {
        toast({ title: "Archivo Inválido", description: "Por favor, selecciona un archivo .json.", variant: "destructive" });
      }
    }
    event.target.value = ''; // Reset to allow re-selection
  };

  const handleDisconnect = async () => {
    await del(BACKUP_DIR_HANDLE_KEY);
    setDirHandle(null);
    setBackupFiles([]);
    toast({ title: "Carpeta Desconectada", description: "La aplicación ya no tiene acceso a la carpeta de respaldos." });
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
          
          <main className="flex-grow flex flex-col gap-8 p-4">
              {isApiSupported ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Gestión de Respaldos</CardTitle>
                    <CardDescription>
                      {dirHandle ? "Crea un nuevo respaldo o restaura desde una copia anterior en tu carpeta conectada." : "Conecta una carpeta en tu dispositivo para gestionar tus respaldos."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!dirHandle ? (
                      <div className="flex flex-col items-center justify-center text-center p-6 border-dashed border-2 rounded-lg">
                        <FolderSync className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="mb-4 text-muted-foreground">Debes dar permiso para acceder a una carpeta donde se guardarán tus respaldos.</p>
                        <Button onClick={handleConnectDirectory}>
                          <FolderSync className="mr-2 h-4 w-4" /> Conectar a Carpeta
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                           <p className="text-sm text-muted-foreground">Carpeta conectada: <Badge variant="secondary">{dirHandle.name}</Badge></p>
                           <Button variant="outline" size="sm" onClick={handleDisconnect}><Trash2 className="mr-2 h-4 w-4"/> Desconectar</Button>
                        </div>
                        <ScrollArea className="h-[250px] border rounded-md">
                           <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre del Archivo</TableHead>
                                <TableHead className="text-right">Fecha de Creación</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isLoadingFiles ? (
                                <TableRow><TableCell colSpan={2} className="text-center">Buscando archivos...</TableCell></TableRow>
                              ) : backupFiles.length > 0 ? (
                                backupFiles.map((file) => (
                                  <TableRow 
                                    key={file.name}
                                    onClick={() => setSelectedFile(file)}
                                    className={`cursor-pointer ${selectedFile?.name === file.name ? 'bg-muted' : ''}`}
                                  >
                                    <TableCell className="font-medium">{file.name}</TableCell>
                                    <TableCell className="text-right">{format(new Date(file.lastModified), 'Pp', { locale: es })}</TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow><TableCell colSpan={2} className="text-center">No se encontraron respaldos en esta carpeta.</TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => handleBackup()} className="w-full sm:w-auto">
                      <Download className="mr-2 h-4 w-4" />
                      Crear Nuevo Respaldo
                    </Button>
                    <Button onClick={() => confirmRestore()} disabled={!selectedFile} className="w-full sm:w-auto">
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Restaurar Selección
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Salvar Datos (Respaldo)</CardTitle>
                      <CardDescription>Crea una copia de seguridad y descárgala a tu dispositivo.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button onClick={createLegacyBackup} className="w-full">
                        <Download className="mr-2 h-4 w-4" /> Descargar Respaldo
                      </Button>
                    </CardFooter>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Leer Datos (Restaurar)</CardTitle>
                      <CardDescription>Selecciona un archivo de respaldo de tu dispositivo para restaurar los datos.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                       <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileSelectForLegacyRestore} 
                          accept="application/json"
                          className="hidden"
                      />
                      <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
                        <FileUp className="mr-2 h-4 w-4" /> Seleccionar Archivo
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}

              <Alert variant="destructive" className="mt-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>¡Atención!</AlertTitle>
                <AlertDescription>
                  Restaurar un respaldo reemplazará todos los datos actuales de la aplicación. Esta acción es irreversible y los datos no guardados se perderán.
                </AlertDescription>
              </Alert>
          </main>
      </div>

      <AlertDialog open={!!fileToRestore || !!selectedFile} onOpenChange={(open) => {
          if (!open) {
            setFileToRestore(null);
            setSelectedFile(null);
          }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas la restauración?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de reemplazar todos los datos de la aplicación con el contenido de <strong>{fileToRestore?.name || selectedFile?.name}</strong>.
              Esta acción no se puede deshacer. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>
              Sí, restaurar datos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
