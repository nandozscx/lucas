
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';

import ClientForm, { type ClientFormData } from '@/components/client-form';
import type { Client, Sale } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit2, Trash2, Users, ArrowLeft, Info, ShoppingCart, DollarSign, CalendarIcon, Package, Bucket } from 'lucide-react';
import { cn } from '@/lib/utils';


const CLIENTS_STORAGE_KEY = 'dailySupplyTrackerClients';
const SALES_STORAGE_KEY = 'dailySupplyTrackerSales';

// Sales Form Schema
const saleFormSchema = z.object({
  date: z.date({ required_error: "La fecha de la venta es obligatoria." }),
  clientId: z.string().min(1, { message: "Debe seleccionar un cliente." }),
  price: z.coerce
    .number({ invalid_type_error: "El precio debe ser un número." })
    .positive({ message: "El precio debe ser un número positivo." })
    .min(0.01, { message: "El precio debe ser mayor que cero." }),
  quantity: z.coerce
    .number({ invalid_type_error: "La cantidad debe ser un número." })
    .positive({ message: "La cantidad debe ser un número positivo." }),
  unit: z.enum(['baldes', 'unidades'], { required_error: "Debe seleccionar una unidad." }),
  downPayment: z.coerce
    .number({ invalid_type_error: "El abono debe ser un número." })
    .min(0, "El abono no puede ser negativo.")
    .optional(),
}).refine((data) => {
    // Ensure downPayment is not more than total amount
    if (data.downPayment !== undefined && data.price > 0 && data.quantity > 0) {
        const totalAmount = data.price * data.quantity * (data.unit === 'baldes' ? 100 : 1);
        return data.downPayment <= totalAmount;
    }
    return true;
}, {
    message: "El abono no puede ser mayor que el monto total de la venta.",
    path: ["downPayment"], // Point error to the downPayment field
});

type SaleFormData = z.infer<typeof saleFormSchema>;


// Sales Form Component
const SaleForm = ({ onSubmitSale, clients }: { onSubmitSale: (data: SaleFormData) => void, clients: Client[] }) => {
    const form = useForm<SaleFormData>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            date: new Date(),
            clientId: undefined,
            price: undefined,
            quantity: undefined,
            unit: 'unidades',
            downPayment: undefined,
        },
    });

    const handleSubmit = (data: SaleFormData) => {
        onSubmitSale(data);
        form.reset({
            date: data.date,
            clientId: undefined,
            price: undefined,
            quantity: undefined,
            unit: 'unidades',
            downPayment: undefined
        });
    };

    return (
        <Card className="shadow-lg rounded-lg">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-primary">
                    <DollarSign className="mr-2 h-6 w-6" />
                    Registrar Nueva Venta
                </CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="font-semibold">Cliente</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un cliente" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>
                                        {client.name}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="font-semibold">Fecha de Venta</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}
                                                >
                                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                                                initialFocus
                                                locale={es}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">Precio de Venta (Unitario)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Ej: 15.25" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">Cantidad</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Ej: 10" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="unit"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel className="font-semibold">Unidad de Medida</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center space-x-4"
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="baldes" />
                                        </FormControl>
                                        <FormLabel className="font-normal flex items-center"><Bucket className="mr-1 h-4 w-4"/> Baldes</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="unidades" />
                                        </FormControl>
                                        <FormLabel className="font-normal flex items-center"><Package className="mr-1 h-4 w-4"/> Unidades</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="downPayment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">Abono (Acta)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Opcional. Ej: 500" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                            <PlusCircle className="mr-2 h-5 w-5" /> Registrar Venta
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
};


export default function SalesClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState('');

  // Load data from localStorage
  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear().toString());
    if (typeof window !== 'undefined') {
      const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (storedClients) {
        try {
          setClients(JSON.parse(storedClients));
        } catch (error) {
          console.error("Falló al parsear clientes desde localStorage", error);
          localStorage.removeItem(CLIENTS_STORAGE_KEY);
        }
      }
      
      const storedSales = localStorage.getItem(SALES_STORAGE_KEY);
        if (storedSales) {
            try {
                const parsedSales = JSON.parse(storedSales);
                // Check for new structure to avoid loading incompatible old data
                if (Array.isArray(parsedSales) && (parsedSales.length === 0 || 'totalAmount' in parsedSales[0])) {
                    setSales(parsedSales);
                } else {
                    console.warn("Estructura de ventas antigua detectada. Se borrarán los datos antiguos.");
                    localStorage.removeItem(SALES_STORAGE_KEY);
                }
            } catch (error) {
                console.error("Falló al parsear ventas desde localStorage", error);
                localStorage.removeItem(SALES_STORAGE_KEY);
            }
        }
    }
  }, []);

  // Save clients to localStorage
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    }
  }, [clients, isClient]);

  // Save sales to localStorage
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
    }
  }, [sales, isClient]);


  // Client management handlers
  const handleOpenAddDialog = () => {
    setEditingClient(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingClient(null);
  }, []);

  const handleClientFormSubmit = useCallback((data: ClientFormData) => {
    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...data } : c));
      toast({ title: "Cliente Actualizado", description: `El cliente "${data.name}" ha sido actualizado.` });
    } else {
      const newClient: Client = { ...data, id: crypto.randomUUID() };
      setClients(prev => [...prev, newClient]);
      toast({ title: "Cliente Agregado", description: `El cliente "${data.name}" ha sido agregado.` });
    }
    handleCloseDialog();
  }, [editingClient, toast, handleCloseDialog]);

  const handleDeleteClientClick = (client: Client) => {
    setClientToDelete(client);
  };
  
  const confirmDeleteClient = () => {
    if (clientToDelete) {
      setClients(prev => prev.filter(p => p.id !== clientToDelete.id));
      toast({ title: "Cliente Eliminado", description: `El cliente "${clientToDelete.name}" ha sido eliminado.`, variant: "destructive" });
      setClientToDelete(null);
    }
  };

  // Sale management handlers
  const handleAddSale = useCallback((data: SaleFormData) => {
    const client = clients.find(c => c.id === data.clientId);
    if (!client) {
      toast({ title: "Error", description: "Cliente no encontrado.", variant: "destructive" });
      return;
    }

    const totalAmount = data.price * data.quantity * (data.unit === 'baldes' ? 100 : 1);
    const finalDownPayment = data.downPayment ?? 0;

    const newSale: Sale = {
      id: crypto.randomUUID(),
      date: format(data.date, "yyyy-MM-dd"),
      clientId: client.id,
      clientName: client.name,
      price: data.price,
      quantity: data.quantity,
      unit: data.unit,
      totalAmount: totalAmount,
      downPayment: finalDownPayment,
    };
    
    setSales(prev => [...prev, newSale]);
    toast({ title: "Venta Registrada", description: `Se ha registrado una venta para ${client.name}.` });
  }, [clients, toast]);
  
  const sortedSales = [...sales].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
        </header>
        <main className="flex-grow space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
        </main>
      </div>
    );
  }

  const EmptyState: React.FC<{ message: string; onAddClick?: () => void, icon?: React.ElementType, buttonText?: string }> = ({ message, onAddClick, icon: Icon = Info, buttonText }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md min-h-[300px]">
      <Icon className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Hay Datos</p>
      <p className="text-sm mb-4">{message}</p>
      {onAddClick && buttonText &&
        <Button onClick={onAddClick} variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> {buttonText}
        </Button>
      }
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg gap-4">
         <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver al Panel
          </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          <ShoppingCart className="mr-3 h-8 w-8" /> Ventas y Clientes
        </h1>
        <div className="w-0 sm:w-auto"></div> {/* Spacer */}
      </header>

      <main className="flex-grow">
        <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="clients">Clientes</TabsTrigger>
            </TabsList>
            
            {/* Sales Tab */}
            <TabsContent value="sales" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    <div className="md:col-span-1">
                        <SaleForm onSubmitSale={handleAddSale} clients={clients} />
                    </div>
                    <div className="md:col-span-2">
                        <Card className="shadow-lg rounded-lg">
                            <CardHeader>
                                <CardTitle>Historial de Ventas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {sortedSales.length === 0 ? (
                                    <EmptyState message="Las ventas que registres aparecerán aquí." />
                                ) : (
                                    <ScrollArea className="h-[500px] rounded-md border whitespace-nowrap">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Cliente</TableHead>
                                                    <TableHead className="text-right">Cantidad</TableHead>
                                                    <TableHead className="text-right">Precio Unit.</TableHead>
                                                    <TableHead className="text-right">Monto Total</TableHead>
                                                    <TableHead className="text-right">Abono</TableHead>
                                                    <TableHead className="text-right">Saldo</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedSales.map(sale => {
                                                  const balance = sale.totalAmount - sale.downPayment;
                                                  return (
                                                    <TableRow key={sale.id}>
                                                      <TableCell>{format(parseISO(sale.date), "PPP", { locale: es })}</TableCell>
                                                      <TableCell>{sale.clientName}</TableCell>
                                                      <TableCell className="text-right">{`${sale.quantity} ${sale.unit}`}</TableCell>
                                                      <TableCell className="text-right">{sale.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                      <TableCell className="text-right">{sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                      <TableCell className="text-right">{sale.downPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                      <TableCell className={`text-right font-medium ${balance > 0 ? 'text-destructive' : ''}`}>{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                    </TableRow>
                                                  );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            {/* Clients Tab */}
            <TabsContent value="clients" className="mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                       <CardTitle>Gestionar Clientes</CardTitle>
                       <Button onClick={handleOpenAddDialog} className="bg-primary hover:bg-primary/90">
                            <PlusCircle className="mr-2 h-5 w-5" /> Agregar Cliente
                        </Button>
                    </CardHeader>
                    <CardContent>
                         {clients.length === 0 ? (
                           <EmptyState message="Comienza agregando tu primer cliente." onAddClick={handleOpenAddDialog} buttonText="Agregar Primer Cliente" icon={Users}/>
                        ) : (
                          <ScrollArea className="h-full rounded-md border shadow-md whitespace-nowrap">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="font-semibold w-[30%]">Nombre</TableHead>
                                  <TableHead className="font-semibold w-[40%]">Dirección</TableHead>
                                  <TableHead className="font-semibold w-[15%]">Teléfono</TableHead>
                                  <TableHead className="text-right font-semibold w-[15%]">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {clients.map((client) => (
                                  <TableRow key={client.id}>
                                    <TableCell className="font-medium py-3">{client.name}</TableCell>
                                    <TableCell className="py-3 whitespace-normal">{client.address}</TableCell>
                                    <TableCell className="py-3">{client.phone}</TableCell>
                                    <TableCell className="text-right py-3">
                                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(client)} aria-label={`Editar ${client.name}`}>
                                        <Edit2 className="h-4 w-4 text-blue-600 hover:text-blue-500" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClientClick(client)} aria-label={`Eliminar ${client.name}`}>
                                        <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsDialogOpen(true);}}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              {editingClient ? <Edit2 className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              {editingClient ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? 'Actualiza los detalles de este cliente.' : 'Completa el formulario para agregar un nuevo cliente.'}
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            onSubmit={handleClientFormSubmit}
            onCancel={handleCloseDialog}
            initialData={editingClient ? { name: editingClient.name, address: editingClient.address, phone: editingClient.phone } : undefined}
            isEditing={!!editingClient}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => { if (!open) setClientToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente "{clientToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClient} className="bg-destructive hover:bg-destructive/90">
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
