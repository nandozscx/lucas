
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  // DialogFooter, // No longer needed here as form has its own footer
  // DialogClose, // No longer needed here
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
import { ScrollArea } from "@/components/ui/scroll-area";
import ProviderForm, { type ProviderFormData } from '@/components/provider-form';
import type { Provider } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit2, Trash2, Users, ArrowLeft, Info, DollarSign } from 'lucide-react';

const PROVIDERS_STORAGE_KEY = 'dailySupplyTrackerProviders';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedProviders = localStorage.getItem(PROVIDERS_STORAGE_KEY);
      if (storedProviders) {
        try {
          const parsedProviders = JSON.parse(storedProviders);
           if (Array.isArray(parsedProviders) && parsedProviders.every(p => 'id' in p && 'name' in p && 'address' in p && 'phone' in p && 'price' in p && typeof p.price === 'number')) {
            setProviders(parsedProviders);
          } else {
            console.warn("Estructura de datos inválida en localStorage para proveedores, limpiando.");
            localStorage.removeItem(PROVIDERS_STORAGE_KEY);
          }
        } catch (error) {
          console.error("Falló al parsear proveedores desde localStorage", error);
          localStorage.removeItem(PROVIDERS_STORAGE_KEY);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
    }
  }, [providers, isClient]);

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

  const handleFormSubmit = useCallback((data: ProviderFormData) => {
    if (editingProvider) {
      setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...p, ...data } : p));
      toast({ title: "Proveedor Actualizado", description: `El proveedor "${data.name}" ha sido actualizado exitosamente.` });
    } else {
      const newProvider: Provider = { ...data, id: crypto.randomUUID() };
      setProviders(prev => [newProvider, ...prev]);
      toast({ title: "Proveedor Agregado", description: `El proveedor "${data.name}" ha sido agregado exitosamente.` });
    }
    handleCloseDialog();
  }, [editingProvider, toast, handleCloseDialog]);

  const handleDeleteProviderClick = (provider: Provider) => {
    setProviderToDelete(provider);
  };
  
  const confirmDelete = () => {
    if (providerToDelete) {
      setProviders(prev => prev.filter(p => p.id !== providerToDelete.id));
      toast({ title: "Proveedor Eliminado", description: `El proveedor "${providerToDelete.name}" ha sido eliminado.`, variant: "destructive" });
      setProviderToDelete(null);
    }
  };

  const EmptyState: React.FC<{ message: string; onAddClick: () => void }> = ({ message, onAddClick }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md">
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
      <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
        </main>
         <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
            <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg gap-4">
         <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al Panel
          </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          <Users className="mr-3 h-8 w-8" /> Gestionar Proveedores
        </h1>
        <Button onClick={handleOpenAddDialog} className="bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-5 w-5" /> Agregar Nuevo Proveedor
        </Button>
      </header>

      <main className="flex-grow">
        {providers.length === 0 ? (
           <EmptyState message="Haz clic en el botón de arriba para agregar tu primer proveedor." onAddClick={handleOpenAddDialog}/>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)] sm:h-[calc(100vh-250px)] rounded-md border shadow-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="font-semibold w-[25%]">Nombre</TableHead>
                  <TableHead className="font-semibold w-[30%]">Dirección</TableHead>
                  <TableHead className="font-semibold w-[15%]">Teléfono</TableHead>
                  <TableHead className="font-semibold w-[15%] text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right font-semibold w-[15%]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium py-3">{provider.name}</TableCell>
                    <TableCell className="py-3 whitespace-pre-wrap">{provider.address}</TableCell>
                    <TableCell className="py-3">{provider.phone}</TableCell>
                    <TableCell className="py-3 text-right">
                      {provider.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </TableCell>
                    <TableCell className="text-right py-3">
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
          </ScrollArea>
        )}
      </main>

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
            onSubmit={handleFormSubmit}
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
            <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. Todos los derechos reservados.</p>
        </footer>
    </div>
  );
}
