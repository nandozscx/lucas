
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
  DialogFooter,
  DialogClose,
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
  // AlertDialogTrigger, // No longer needed here
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
import { PlusCircle, Edit2, Trash2, Users, ArrowLeft, Info } from 'lucide-react';

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
           if (Array.isArray(parsedProviders) && parsedProviders.every(p => 'id' in p && 'name' in p && 'address' in p && 'phone' in p)) {
            setProviders(parsedProviders);
          } else {
            console.warn("Invalid data structure in localStorage for providers, clearing.");
            localStorage.removeItem(PROVIDERS_STORAGE_KEY);
          }
        } catch (error) {
          console.error("Failed to parse providers from localStorage", error);
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
    setEditingProvider(null); // Clear editing state when dialog closes
  }, []);

  const handleFormSubmit = useCallback((data: ProviderFormData) => {
    if (editingProvider) {
      // Edit existing provider
      setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...p, ...data } : p));
      toast({ title: "Provider Updated", description: `Provider "${data.name}" has been updated successfully.` });
    } else {
      // Add new provider
      const newProvider: Provider = { ...data, id: crypto.randomUUID() };
      setProviders(prev => [newProvider, ...prev]);
      toast({ title: "Provider Added", description: `Provider "${data.name}" has been added successfully.` });
    }
    handleCloseDialog();
  }, [editingProvider, toast, handleCloseDialog]);

  // This function now just sets the state to open the AlertDialog
  const handleDeleteProviderClick = (provider: Provider) => {
    setProviderToDelete(provider);
  };
  
  const confirmDelete = () => {
    if (providerToDelete) {
      setProviders(prev => prev.filter(p => p.id !== providerToDelete.id));
      toast({ title: "Provider Deleted", description: `Provider "${providerToDelete.name}" has been deleted.`, variant: "destructive" });
      setProviderToDelete(null); // Close AlertDialog
    }
  };

  const EmptyState: React.FC<{ message: string; onAddClick: () => void }> = ({ message, onAddClick }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md">
      <Info className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Providers Found</p>
      <p className="text-sm mb-4">{message}</p>
      <Button onClick={onAddClick} variant="outline">
        <PlusCircle className="mr-2 h-4 w-4" /> Add First Provider
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
            Back to Dashboard
          </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          <Users className="mr-3 h-8 w-8" /> Manage Providers
        </h1>
        <Button onClick={handleOpenAddDialog} className="bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Provider
        </Button>
      </header>

      <main className="flex-grow">
        {providers.length === 0 ? (
           <EmptyState message="Click the button above to add your first provider." onAddClick={handleOpenAddDialog}/>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)] sm:h-[calc(100vh-250px)] rounded-md border shadow-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="font-semibold w-[25%]">Name</TableHead>
                  <TableHead className="font-semibold w-[35%]">Address</TableHead>
                  <TableHead className="font-semibold w-[20%]">Phone</TableHead>
                  <TableHead className="text-right font-semibold w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium py-3">{provider.name}</TableCell>
                    <TableCell className="py-3 whitespace-pre-wrap">{provider.address}</TableCell>
                    <TableCell className="py-3">{provider.phone}</TableCell>
                    <TableCell className="text-right py-3">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(provider)} aria-label={`Edit ${provider.name}`}>
                        <Edit2 className="h-4 w-4 text-blue-600 hover:text-blue-500" />
                      </Button>
                      {/* Removed AlertDialogTrigger wrapper */}
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProviderClick(provider)} aria-label={`Delete ${provider.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {providers.length > 8 && <TableCaption>Scroll for more providers.</TableCaption>}
            </Table>
          </ScrollArea>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsDialogOpen(true);}}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              {editingProvider ? <Edit2 className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              {editingProvider ? 'Edit Provider' : 'Add New Provider'}
            </DialogTitle>
            <DialogDescription>
              {editingProvider ? 'Update the details for this provider.' : 'Fill in the form below to add a new provider.'}
            </DialogDescription>
          </DialogHeader>
          <ProviderForm
            onSubmit={handleFormSubmit}
            onCancel={handleCloseDialog}
            initialData={editingProvider ? { name: editingProvider.name, address: editingProvider.address, phone: editingProvider.phone } : undefined}
            isEditing={!!editingProvider}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!providerToDelete} onOpenChange={(open) => { if (!open) setProviderToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the provider "{providerToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProviderToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
            <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. All rights reserved.</p>
        </footer>
    </div>
  );
}

