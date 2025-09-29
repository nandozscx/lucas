"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Delivery as DeliveryType, Provider } from '@/types';
import SupplyEntryForm, { type DailyRegistryFormData } from '@/components/supply-entry-form';
import SupplyDataView from '@/components/supply-data-view';
import ProviderForm, { type ProviderFormData } from '@/components/provider-form';
import { useToast } from "@/hooks/use-toast";
import { capitalize } from '@/lib/utils';

import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ClipboardList, Users as UsersIcon, PlusCircle, Edit2, Trash2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PROVIDERS_STORAGE_KEY = 'dailySupplyTrackerProviders';

export default function OperationsPage() {
  const [deliveries, setDeliveries] = useState<DeliveryType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [dailyTotals, setDailyTotals] = useState<Record<string, number>>({});
  const [isClient, setIsClient] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const { toast } = useToast();

  // State for provider dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);


  useEffect(() => {
    const loadData = () => {
      // Load Deliveries
      const storedDeliveries = localStorage.getItem(DELIVERIES_STORAGE_KEY);
      if (storedDeliveries) {
        try {
          const parsedDeliveries = JSON.parse(storedDeliveries);
          if (Array.isArray(parsedDeliveries)) setDeliveries(parsedDeliveries);
        } catch (error) { console.error("Error parsing deliveries", error); }
      }

      // Load Providers
      const storedProviders = localStorage.getItem(PROVIDERS_STORAGE_KEY);
      if (storedProviders) {
        try {
          const parsedProviders = JSON.parse(storedProviders);
          if (Array.isArray(parsedProviders)) setProviders(parsedProviders);
        } catch (error) { console.error("Error parsing providers", error); }
      }
    };
    
    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());
    if (typeof window !== 'undefined') {
      loadData();
    }
  }, []);

  // Effect for saving deliveries and calculating daily totals
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(deliveries));
      const newDailyTotals: Record<string, number> = {};
      deliveries.forEach(delivery => {
        newDailyTotals[delivery.date] = (newDailyTotals[delivery.date] || 0) + delivery.quantity;
      });
      setDailyTotals(newDailyTotals);
      // Dispatch event so other components (like history, production) can refresh their data.
      window.dispatchEvent(new CustomEvent('storage-update'));
    }
  }, [deliveries, isClient]);
  
  // Effect for saving providers
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
      // Dispatch event so the global voice assistant can get updated providers list
      window.dispatchEvent(new CustomEvent('storage-update'));
    }
  }, [providers, isClient]);

  // Handler for adding/updating deliveries
  const handleAddDeliveries = useCallback((data: DailyRegistryFormData) => {
    const dateStr = format(data.date, "yyyy-MM-dd");
    const submittedEntries = data.entries.filter(
      (entry) => entry.quantity !== undefined && entry.quantity !== null && entry.quantity >= 0
    );

    if (submittedEntries.length === 0) {
      toast({
        title: "Sin Entregas para Registrar",
        description: "No se ingresaron cantidades.",
        variant: "default",
      });
      return;
    }
    
    const submittedProviderNames = new Set(submittedEntries.map(e => e.providerName));

    setDeliveries(prevDeliveries => {
      const otherDeliveries = prevDeliveries.filter(delivery => {
        return delivery.date !== dateStr || !submittedProviderNames.has(delivery.providerName);
      });
      const newDeliveriesForDate: DeliveryType[] = submittedEntries.map(entry => ({
        id: crypto.randomUUID(),
        providerName: entry.providerName,
        date: dateStr,
        quantity: entry.quantity!,
      }));
      return [...otherDeliveries, ...newDeliveriesForDate];
    });

    toast({
      title: "Entregas Registradas",
      description: `${submittedEntries.length} entrega(s) para el ${capitalize(format(data.date, "EEEE, dd/MM", { locale: es }))} han sido registradas/actualizadas.`,
    });
  }, [toast]);

  // Handlers for Provider management
  const handleOpenAddDialog = () => {
    setEditingProvider(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (provider: Provider) => {
    setEditingProvider(provider);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingProvider(null);
  }, []);

  const handleProviderFormSubmit = useCallback((data: ProviderFormData) => {
    if (editingProvider) {
      setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...p, ...data } : p));
      toast({ title: "Proveedor Actualizado", description: `El proveedor "${data.name}" ha sido actualizado.` });
    } else {
      const newProvider: Provider = { ...data, id: crypto.randomUUID() };
      setProviders(prev => [...prev, newProvider]);
      toast({ title: "Proveedor Agregado", description: `El proveedor "${data.name}" ha sido agregado.` });
    }
    handleCloseDialog();
  }, [editingProvider, toast, handleCloseDialog]);

  const handleDeleteProviderClick = (provider: Provider) => {
    setProviderToDelete(provider);
  };
  
  const confirmDeleteProvider = () => {
    if (providerToDelete) {
      setProviders(prev => prev.filter(p => p.id !== providerToDelete.id));
      toast({ title: "Proveedor Eliminado", description: `El proveedor "${providerToDelete.name}" ha sido eliminado.`, variant: "destructive" });
      setProviderToDelete(null);
    }
  };

  const EmptyProvidersState: React.FC<{ message: string; onAddClick: () => void }> = ({ message, onAddClick }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md min-h-[400px]">
      <Info className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Hay Proveedores</p>
      <p className="text-sm mb-4">{message}</p>
      <Button onClick={onAddClick} variant="outline">
        <PlusCircle className="mr-2 h-4 w-4" /> Agregar Primer Proveedor
      </Button>
    </div>
  );

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
        <header className="flex items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
        </header>
        <main className="flex-grow">
            <Skeleton className="h-12 w-1/3 mb-4"/>
            <Skeleton className="h-[600px] w-full"/>
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
          <ClipboardList className="mr-3 h-8 w-8" /> Operaciones
        </h1>
        <div className="w-0 sm:w-auto"></div> 
      </header>

      <main className="flex-grow">
        <Tabs defaultValue="deliveries" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="deliveries">Entregas</TabsTrigger>
                <TabsTrigger value="providers">Proveedores</TabsTrigger>
            </TabsList>
            
            <TabsContent value="deliveries" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    <div className="lg:col-span-1 space-y-6">
                    {providers.length === 0 ? (
                        <Alert variant="destructive" className="shadow-md">
                            <UsersIcon className="h-4 w-4" />
                            <AlertTitle>No hay proveedores registrados</AlertTitle>
                            <AlertDescription>
                                Por favor, ve a la pestaña "Proveedores" para agregar al menos uno antes de registrar entregas.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <SupplyEntryForm onSubmitDeliveries={handleAddDeliveries} providers={providers} />
                    )}
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                    <SupplyDataView
                        deliveries={deliveries}
                        dailyTotals={dailyTotals}
                        providers={providers} 
                    />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="providers" className="mt-6">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <CardTitle>Gestionar Proveedores</CardTitle>
                        <Button onClick={handleOpenAddDialog} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-5 w-5" /> Agregar Proveedor
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {providers.length === 0 ? (
                            <EmptyProvidersState message="Agrega tu primer proveedor para poder registrar entregas." onAddClick={handleOpenAddDialog}/>
                        ) : (
                        <ScrollArea className="flex-1 min-h-0 rounded-md border shadow-md whitespace-nowrap">
                            <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                <TableHead className="font-semibold">Nombre</TableHead>
                                <TableHead className="font-semibold">Dirección</TableHead>
                                <TableHead className="font-semibold">Teléfono</TableHead>
                                <TableHead className="font-semibold text-right">Precio Unit.</TableHead>
                                <TableHead className="text-right font-semibold">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {providers.map((provider) => (
                                <TableRow key={provider.id}>
                                    <TableCell className="font-medium">{provider.name}</TableCell>
                                    <TableCell className="whitespace-normal">{provider.address}</TableCell>
                                    <TableCell>{provider.phone}</TableCell>
                                    <TableCell className="text-right">
                                    S/. {provider.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </TableCell>
                                    <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(provider)} aria-label={`Editar ${provider.name}`}>
                                        <Edit2 className="h-4 w-4 text-blue-600 hover:text-blue-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProviderClick(provider)} aria-label={`Eliminar ${provider.name}`}>
                                        <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                                    </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                            {providers.length > 8 && <TableCaption>Desplázate para ver más proveedores.</TableCaption>}
                            </Table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>

       {/* Dialogs for Provider Management */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsDialogOpen(true);}}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              {editingProvider ? <Edit2 className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              {editingProvider ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}
            </DialogTitle>
            <DialogDescription>
              {editingProvider ? 'Actualiza los detalles de este proveedor.' : 'Completa el formulario para agregar un nuevo proveedor.'}
            </DialogDescription>
          </DialogHeader>
          <ProviderForm
            onSubmit={handleProviderFormSubmit}
            onCancel={handleCloseDialog}
            initialData={editingProvider ? { name: editingProvider.name, address: editingProvider.address, phone: editingProvider.phone, price: editingProvider.price } : undefined}
            isEditing={!!editingProvider}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!providerToDelete} onOpenChange={(open) => { if (!open) setProviderToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al proveedor "{providerToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProviderToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProvider} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {currentYear} acopiapp. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
