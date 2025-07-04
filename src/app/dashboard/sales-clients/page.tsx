
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
  DialogFooter,
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
  TableFooter,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, subDays, subMonths, subYears } from "date-fns";
import { es } from 'date-fns/locale';

import ClientForm, { type ClientFormData } from '@/components/client-form';
import type { Client, Sale, Payment } from '@/types';
import type jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit2, Trash2, Users, ArrowLeft, Info, ShoppingCart, DollarSign, CalendarIcon, Package, Box, Download, HandCoins, Library, Landmark, Ban } from 'lucide-react';
import { cn, capitalize } from '@/lib/utils';


const CLIENTS_STORAGE_KEY = 'dailySupplyTrackerClients';
const SALES_STORAGE_KEY = 'dailySupplyTrackerSales';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

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
const SaleForm = ({ onSubmitSale, clients, onClientChange }: { onSubmitSale: (data: SaleFormData) => void, clients: Client[], onClientChange: (clientId: string) => void }) => {
    const form = useForm<SaleFormData>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            date: new Date(),
            clientId: '',
            price: '' as any,
            quantity: '' as any,
            unit: 'baldes',
            downPayment: '' as any,
        },
    });

    const handleSubmit = (data: SaleFormData) => {
        onSubmitSale(data);
        form.reset({
            date: new Date(),
            clientId: '',
            price: '' as any,
            quantity: '' as any,
            unit: 'baldes',
            downPayment: '' as any,
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
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    if (value) onClientChange(value);
                                  }} 
                                  value={field.value ?? ''}
                                >
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
                                                    {field.value ? capitalize(format(field.value, "EEEE, dd/MM/yyyy", { locale: es })) : <span>Seleccione una fecha</span>}
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
                                        <Input type="number" placeholder="Ej: 15.25" {...field} value={field.value ?? ''} />
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
                                        <Input type="number" placeholder="Ej: 10" {...field} value={field.value ?? ''} />
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
                                        <FormLabel className="font-normal flex items-center"><Box className="mr-1 h-4 w-4"/> Baldes</FormLabel>
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
                                        <Input type="number" placeholder="Opcional. Ej: 500" {...field} value={field.value ?? ''} />
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
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [saleForPayment, setSaleForPayment] = useState<Sale | null>(null);
  const [isConsolidatedDialogOpen, setIsConsolidatedDialogOpen] = useState(false);
  const [isDebtPaymentDialogOpen, setIsDebtPaymentDialogOpen] = useState(false);
  const [isCancelAccountDialogOpen, setIsCancelAccountDialogOpen] = useState(false);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState('');
  const [selectedClientIdForHistory, setSelectedClientIdForHistory] = useState<string | null>(null);
  const [selectedClientIdForDebts, setSelectedClientIdForDebts] = useState<string | null>(null);
  const [showPaidSales, setShowPaidSales] = useState(false);

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
                // Allow any to handle old structure temporarily
                const parsedSales: any[] = JSON.parse(storedSales);
                const migratedSales: Sale[] = parsedSales.map(sale => {
                    // If sale has downPayment but not payments, it's the old structure
                    if (sale.downPayment !== undefined && !sale.payments) {
                        const { downPayment, ...rest } = sale;
                        return {
                            ...rest,
                            payments: downPayment > 0 ? [{ date: sale.date, amount: downPayment }] : [],
                        };
                    }
                    // Ensure payments is an array for sales that might have been partially migrated or corrupted
                    if (!Array.isArray(sale.payments)) {
                        sale.payments = [];
                    }
                    return sale;
                });
                setSales(migratedSales);
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
  
  const confirmDeleteSale = () => {
    if (saleToDelete) {
      setSales(prev => prev.filter(s => s.id !== saleToDelete.id));
      toast({
        title: "Venta Eliminada",
        description: `La venta para "${saleToDelete.clientName}" ha sido eliminada.`,
        variant: "destructive",
      });
      setSaleToDelete(null);
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
      payments: finalDownPayment > 0 ? [{ date: format(data.date, "yyyy-MM-dd"), amount: finalDownPayment }] : [],
    };
    
    setSales(prev => [...prev, newSale].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
    toast({ title: "Venta Registrada", description: `Se ha registrado una venta para ${client.name}.` });
  }, [clients, toast]);
  
  const allSortedSales = [...sales].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const allSalesForSelectedClient = React.useMemo(() => {
    if (!selectedClientIdForHistory) return [];
    return allSortedSales.filter(sale => sale.clientId === selectedClientIdForHistory);
  }, [selectedClientIdForHistory, allSortedSales]);

  const salesForSelectedClient = React.useMemo(() => {
    if (showPaidSales) {
        return allSalesForSelectedClient;
    }
    return allSalesForSelectedClient.filter(sale => {
        const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = sale.totalAmount - totalPaid;
        return balance > 0;
    });
  }, [allSalesForSelectedClient, showPaidSales]);
    
  const totalDebtForSelectedClient = React.useMemo(() => allSalesForSelectedClient.reduce((total, sale) => {
    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = sale.totalAmount - totalPaid;
    return total + (balance > 0 ? balance : 0);
  }, 0), [allSalesForSelectedClient]);

  const handlePaymentSubmit = (data: { amount: number }) => {
    if (!saleForPayment) return;

    setSales(prevSales =>
        prevSales.map(sale =>
            sale.id === saleForPayment.id
                ? { ...sale, payments: [...sale.payments, { date: format(new Date(), "yyyy-MM-dd"), amount: data.amount }] }
                : sale
        )
    );

    toast({
        title: "Pago Registrado",
        description: `Se registró un pago de S/. ${data.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} para la venta del ${capitalize(format(parseISO(saleForPayment.date), "EEEE, dd/MM", { locale: es }))}.`
    });
    setSaleForPayment(null); // Close the dialog
  };

  const exportSalesToPDF = async () => {
    if (!selectedClientIdForHistory) {
      toast({
        title: "Seleccione un Cliente",
        description: "Por favor, seleccione un cliente para exportar su historial de ventas.",
        variant: "destructive",
      });
      return;
    }
    
    if (salesForSelectedClient.length === 0) {
      toast({
        title: "Sin Datos",
        description: "No hay ventas en la vista actual para exportar.",
        variant: "destructive",
      });
      return;
    }

    const { default: jsPDFConstructor } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDFConstructor() as jsPDFWithAutoTable;
    
    const clientName = clients.find(c => c.id === selectedClientIdForHistory)?.name || 'Cliente Desconocido';
    const title = `Historial de Ventas - ${clientName}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 15);

    const tableHeaders = ['Fecha', 'Cantidad', 'Precio Unit.', 'Monto Total', 'Abono', 'Saldo'];
    const tableBody = salesForSelectedClient.map(sale => {
      const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = sale.totalAmount - totalPaid;
      return [
        capitalize(format(parseISO(sale.date), "EEEE, dd/MM", { locale: es })),
        `${sale.quantity} ${sale.unit}`,
        `S/. ${sale.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `S/. ${sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `S/. ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `S/. ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 22,
      foot: [
        ['', '', '', '', 'Deuda Total:', `S/. ${totalDebtForSelectedClient.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
      ],
      footStyles: { fontStyle: 'bold', halign: 'right' },
    });

    doc.save(`historial_ventas_${clientName.replace(/\s/g, '_')}.pdf`);
    toast({
      title: "Exportación PDF Exitosa",
      description: "El historial de ventas se ha exportado a PDF.",
    });
  };

  // Debt Tab Logic
  const salesForDebtsTab = React.useMemo(() => {
    if (!selectedClientIdForDebts) return [];
    return sales
      .filter(s => s.clientId === selectedClientIdForDebts)
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [sales, selectedClientIdForDebts]);

  const totalClientDebt = React.useMemo(() => {
    return salesForDebtsTab.reduce((total, sale) => {
      const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = sale.totalAmount - totalPaid;
      return total + (balance > 0 ? balance : 0);
    }, 0);
  }, [salesForDebtsTab]);
  
  const handleTotalDebtPayment = (amountPaid: number) => {
    if (!selectedClientIdForDebts) return;
  
    let remainingAmountToPay = amountPaid;
    const today = format(new Date(), "yyyy-MM-dd");
  
    const updatedSales = [...sales];
    
    const debtsToPay = salesForDebtsTab
      .filter(s => {
        const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
        return s.totalAmount > totalPaid;
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  
    for (const debt of debtsToPay) {
      if (remainingAmountToPay <= 0) break;
  
      const saleInState = updatedSales.find(s => s.id === debt.id);
      if (!saleInState) continue;
  
      const totalPaid = saleInState.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = saleInState.totalAmount - totalPaid;
      const paymentForThisSale = Math.min(remainingAmountToPay, balance);
  
      if (paymentForThisSale > 0) {
        saleInState.payments.push({ date: today, amount: paymentForThisSale });
        remainingAmountToPay -= paymentForThisSale;
      }
    }
  
    setSales(updatedSales);
    toast({
      title: "Abono Registrado",
      description: `Se abonó S/. ${amountPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} a la deuda total.`
    });
    setIsDebtPaymentDialogOpen(false);
  };
  
  const handleCancelAccount = (cutoffDate: Date) => {
    if (!selectedClientIdForDebts) return;

    const updatedSales = sales.map(sale => {
      // Check if the sale belongs to the selected client and is on or before the cutoff date
      if (sale.clientId === selectedClientIdForDebts && parseISO(sale.date) <= cutoffDate) {
        const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = sale.totalAmount - totalPaid;

        if (balance > 0) {
          // Add a new payment to clear the balance
          const newPayment: Payment = {
            date: format(cutoffDate, "yyyy-MM-dd"), // Use cutoff date for payment
            amount: balance,
          };
          return {
            ...sale,
            payments: [...sale.payments, newPayment],
          };
        }
      }
      return sale; // Return sale unchanged if conditions are not met
    });

    setSales(updatedSales);
    toast({
      title: "Cuentas Saldadas",
      description: `Todas las deudas para ${clients.find(c => c.id === selectedClientIdForDebts)?.name} hasta el ${capitalize(format(cutoffDate, "EEEE, dd/MM", { locale: es }))} han sido marcadas como pagadas.`
    });
    setIsCancelAccountDialogOpen(false);
  };


  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
        <header className="flex items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg">
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
    <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg gap-4">
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
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="clients">Clientes</TabsTrigger>
                <TabsTrigger value="debts">Deudas</TabsTrigger>
            </TabsList>
            
            {/* Sales Tab */}
            <TabsContent value="sales" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    <div className="md:col-span-1">
                        <SaleForm 
                          onSubmitSale={handleAddSale} 
                          clients={clients} 
                          onClientChange={(clientId) => {
                            setSelectedClientIdForHistory(clientId);
                            setSelectedClientIdForDebts(clientId);
                          }} 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Card className="shadow-lg rounded-lg">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <div>
                                      <CardTitle>Historial de Ventas</CardTitle>
                                      {selectedClientIdForHistory ? (
                                          <CardDescription>
                                              Mostrando ventas para: {clients.find(c => c.id === selectedClientIdForHistory)?.name || 'Cliente desconocido'}
                                          </CardDescription>
                                      ) : (
                                          <CardDescription>
                                              Seleccione un cliente para ver su historial.
                                          </CardDescription>
                                      )}
                                  </div>
                                  {selectedClientIdForHistory && (
                                      <div className="flex items-center space-x-2 self-end sm:self-center">
                                          <Checkbox
                                              id="show-paid"
                                              checked={showPaidSales}
                                              onCheckedChange={(checked) => setShowPaidSales(Boolean(checked))}
                                          />
                                          <Label htmlFor="show-paid" className="text-sm font-medium leading-none whitespace-nowrap">
                                              Mostrar Pagadas
                                          </Label>
                                      </div>
                                  )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!selectedClientIdForHistory ? (
                                    <EmptyState message="Seleccione un cliente en el formulario para ver sus ventas." icon={Users} />
                                ) : salesForSelectedClient.length === 0 ? (
                                    <EmptyState message={showPaidSales ? "Este cliente aún no tiene ventas registradas." : "Este cliente no tiene deudas pendientes."} icon={ShoppingCart}/>
                                ) : (
                                    <ScrollArea className="h-[440px] rounded-md border whitespace-nowrap">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Cantidad</TableHead>
                                                    <TableHead className="text-right">Precio Unit.</TableHead>
                                                    <TableHead className="text-right">Monto Total</TableHead>
                                                    <TableHead className="text-right">Abono</TableHead>
                                                    <TableHead className="text-right">Saldo</TableHead>
                                                    <TableHead className="text-center">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {salesForSelectedClient.map(sale => {
                                                  const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
                                                  const balance = sale.totalAmount - totalPaid;
                                                  return (
                                                    <TableRow key={sale.id}>
                                                      <TableCell>{capitalize(format(parseISO(sale.date), "EEEE, dd/MM", { locale: es }))}</TableCell>
                                                      <TableCell>{`${sale.quantity} ${sale.unit}`}</TableCell>
                                                      <TableCell className="text-right">S/. {sale.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                                      <TableCell className="text-right">S/. {sale.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                                      <TableCell className="text-right">S/. {totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                                      <TableCell className={`text-right font-medium ${balance > 0 ? 'text-destructive' : ''}`}>S/. {balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                                      <TableCell className="text-center">
                                                          <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              onClick={() => setSaleForPayment(sale)}
                                                              disabled={balance <= 0}
                                                              aria-label="Añadir pago"
                                                          >
                                                              <HandCoins className="h-4 w-4 text-green-500" />
                                                          </Button>
                                                          <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              onClick={() => setSaleToDelete(sale)}
                                                              aria-label="Eliminar Venta"
                                                          >
                                                              <Trash2 className="h-4 w-4 text-destructive" />
                                                          </Button>
                                                      </TableCell>
                                                    </TableRow>
                                                  );
                                                })}
                                            </TableBody>
                                             <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-right font-bold text-lg">Deuda Total:</TableCell>
                                                    <TableCell className="text-right font-bold text-lg text-destructive">
                                                        S/. {totalDebtForSelectedClient.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                    </TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                )}
                            </CardContent>
                             {allSalesForSelectedClient.length > 0 && (
                                <CardFooter className="flex flex-col items-stretch sm:items-end border-t pt-6 gap-2">
                                     <Button onClick={() => setIsConsolidatedDialogOpen(true)} variant="outline">
                                        <Library className="mr-2 h-4 w-4" />
                                        Consolidado de Deuda
                                    </Button>
                                    <Button onClick={exportSalesToPDF} className="bg-accent text-accent-foreground hover:bg-accent/90">
                                        <Download className="mr-2 h-4 w-4" />
                                        Exportar Historial a PDF
                                    </Button>
                                </CardFooter>
                            )}
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
                                  <TableHead className="font-semibold">Nombre</TableHead>
                                  <TableHead className="font-semibold">Dirección</TableHead>
                                  <TableHead className="font-semibold">Teléfono</TableHead>
                                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {clients.map((client) => (
                                  <TableRow key={client.id}>
                                    <TableCell className="font-medium">{client.name}</TableCell>
                                    <TableCell className="whitespace-nowrap">{client.address}</TableCell>
                                    <TableCell>{client.phone}</TableCell>
                                    <TableCell className="text-right">
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
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Debts Tab */}
            <TabsContent value="debts" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Deudas de Clientes</CardTitle>
                  <CardDescription>Seleccione un cliente para ver y gestionar sus deudas pendientes.</CardDescription>
                  <div className="pt-4">
                    <Select onValueChange={setSelectedClientIdForDebts} value={selectedClientIdForDebts ?? ''}>
                      <SelectTrigger className="w-full sm:w-1/2">
                        <SelectValue placeholder="Seleccione un cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedClientIdForDebts ? (
                    <EmptyState message="Seleccione un cliente para ver su estado de deuda." icon={Users} />
                  ) : salesForDebtsTab.length === 0 ? (
                    <EmptyState message="Este cliente no tiene un historial de ventas." icon={ShoppingCart}/>
                  ) : (
                    <ScrollArea className="h-full max-h-[500px] rounded-md border whitespace-nowrap">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha Venta</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Monto Total</TableHead>
                            <TableHead className="text-right">Total Pagado</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesForDebtsTab.map(sale => {
                            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
                            const balance = sale.totalAmount - totalPaid;
                            const isPaid = balance <= 0;
                            return (
                              <TableRow key={sale.id} className={cn(isPaid && "text-muted-foreground")}>
                                <TableCell>{capitalize(format(parseISO(sale.date), 'EEEE, dd/MM', { locale: es }))}</TableCell>
                                <TableCell>{`Venta de ${sale.quantity} ${sale.unit}`}</TableCell>
                                <TableCell className="text-right">S/. {sale.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-right">S/. {totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className={cn("text-right font-medium", !isPaid && "text-destructive")}>S/. {balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={isPaid ? "secondary" : "destructive"}>
                                        {isPaid ? "Pagada" : "Pendiente"}
                                    </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={5} className="text-right font-bold text-lg">Deuda Total Pendiente:</TableCell>
                            <TableCell className="text-right font-bold text-lg text-destructive">
                              S/. {totalClientDebt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  )}
                </CardContent>
                {totalClientDebt > 0 && (
                  <CardFooter className="justify-end border-t pt-6 gap-2">
                    <Button variant="destructive" onClick={() => setIsCancelAccountDialogOpen(true)}>
                      <Ban className="mr-2 h-4 w-4"/> Cancelar Cuentas
                    </Button>
                    <Button onClick={() => setIsDebtPaymentDialogOpen(true)}>
                      <Landmark className="mr-2 h-4 w-4"/> Registrar Abono
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
        </Tabs>
      </main>

      {/* Payment Dialog */}
      {saleForPayment && (
        <PaymentDialog
          sale={saleForPayment}
          onClose={() => setSaleForPayment(null)}
          onSubmit={handlePaymentSubmit}
        />
      )}
      
      {/* Debt Payment Dialog */}
      {selectedClientIdForDebts && (
        <DebtPaymentDialog
          isOpen={isDebtPaymentDialogOpen}
          onClose={() => setIsDebtPaymentDialogOpen(false)}
          onSubmit={handleTotalDebtPayment}
          totalDebt={totalClientDebt}
          clientName={clients.find(c => c.id === selectedClientIdForDebts)?.name || ''}
        />
      )}
      
      {/* Cancel Account Dialog */}
      {selectedClientIdForDebts && (
        <CancelAccountDialog
          isOpen={isCancelAccountDialogOpen}
          onClose={() => setIsCancelAccountDialogOpen(false)}
          onSubmit={handleCancelAccount}
          clientName={clients.find(c => c.id === selectedClientIdForDebts)?.name || ''}
        />
      )}

      {/* Consolidated Debt Dialog */}
      {selectedClientIdForHistory && (
        <ConsolidatedDebtDialog
            isOpen={isConsolidatedDialogOpen}
            onClose={() => setIsConsolidatedDialogOpen(false)}
            client={clients.find(c => c.id === selectedClientIdForHistory)!}
            sales={allSalesForSelectedClient}
            toast={toast}
        />
      )}

      {/* Client Edit/Add Dialog */}
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

      {/* Client Delete Confirmation */}
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
      
      {/* Sale Delete Confirmation */}
      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => { if (!open) setSaleToDelete(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la venta del {saleToDelete ? capitalize(format(parseISO(saleToDelete.date), "EEEE, dd/MM", { locale: es })) : ''} para el cliente "{saleToDelete?.clientName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSale} className="bg-destructive hover:bg-destructive/90">
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

// Payment Dialog Component
const PaymentDialog = ({ sale, onClose, onSubmit }: { sale: Sale, onClose: () => void, onSubmit: (data: { amount: number }) => void }) => {
  const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = sale.totalAmount - totalPaid;

  const paymentFormSchema = z.object({
    amount: z.coerce
      .number({ invalid_type_error: "El monto debe ser un número." })
      .positive({ message: "El monto debe ser un número positivo." })
      .max(balance, { message: `El pago no puede exceder el saldo de S/. ${balance.toLocaleString()}`})
  });

  type PaymentFormData = z.infer<typeof paymentFormSchema>;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { amount: undefined },
  });

  const handleFormSubmit = (data: PaymentFormData) => {
    onSubmit(data);
  };
  
  return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Registrar Pago</DialogTitle>
                  <DialogDescription>
                      Añadir un nuevo abono para la venta del {capitalize(format(parseISO(sale.date), "EEEE, dd/MM", { locale: es }))}.
                  </DialogDescription>
              </DialogHeader>

              {sale.payments.length > 0 && (
                <div className="space-y-2 pt-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Historial de Abonos</h4>
                    <ScrollArea className="h-[100px] w-full rounded-md border p-2">
                        <div className="space-y-1">
                            {sale.payments.map((payment, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span>{capitalize(format(parseISO(payment.date), "EEEE, dd/MM", { locale: es }))}</span>
                                    <span className="font-mono">S/. {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
              )}

              <div className="text-sm space-y-1">
                  <p><strong>Cliente:</strong> {sale.clientName}</p>
                  <p><strong>Monto Total:</strong> S/. {sale.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p><strong>Total Abonado:</strong> S/. {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p><strong>Saldo Actual:</strong> <span className="font-bold text-destructive">S/. {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
              </div>

              <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                      <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Monto del Pago</FormLabel>
                                  <FormControl>
                                      <Input type="number" placeholder="Ingrese el monto a abonar" {...field} value={field.value ?? ''}/>
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <DialogFooter>
                          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                          <Button type="submit">Guardar Pago</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
  );
};


// Debt Payment Dialog Component
const DebtPaymentDialog = ({ isOpen, onClose, onSubmit, totalDebt, clientName }: { isOpen: boolean, onClose: () => void, onSubmit: (amount: number) => void, totalDebt: number, clientName: string }) => {
  const debtPaymentFormSchema = z.object({
    amount: z.coerce
      .number({ invalid_type_error: "El monto debe ser un número." })
      .positive({ message: "El monto debe ser un número positivo." })
      .max(totalDebt, { message: `El pago no puede exceder la deuda total de S/. ${totalDebt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` })
  });

  type DebtPaymentFormData = z.infer<typeof debtPaymentFormSchema>;

  const form = useForm<DebtPaymentFormData>({
    resolver: zodResolver(debtPaymentFormSchema),
    defaultValues: { amount: undefined },
  });
  
  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleFormSubmit = (data: DebtPaymentFormData) => {
    onSubmit(data.amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Abono a Deuda Total</DialogTitle>
          <DialogDescription>
            Abono para {clientName}. El pago se aplicará a las deudas más antiguas primero.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm">
          <p><strong>Deuda Total Pendiente:</strong> <span className="font-bold text-destructive">S/. {totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a Abonar</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ingrese el monto del abono" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Guardar Abono</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Cancel Account Dialog Component
const CancelAccountDialog = ({ isOpen, onClose, onSubmit, clientName }: { isOpen: boolean, onClose: () => void, onSubmit: (date: Date) => void, clientName: string }) => {
  const cancelFormSchema = z.object({
    cutoffDate: z.date({ required_error: "Debe seleccionar una fecha de corte." }),
  });

  type CancelFormData = z.infer<typeof cancelFormSchema>;

  const form = useForm<CancelFormData>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: { cutoffDate: new Date() },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({ cutoffDate: new Date() });
    }
  }, [isOpen, form]);

  const handleFormSubmit = (data: CancelFormData) => {
    onSubmit(data.cutoffDate);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Cuentas Pendientes</DialogTitle>
          <DialogDescription>
            Esta acción marcará como pagadas todas las deudas pendientes para <strong>{clientName}</strong> hasta la fecha que selecciones. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="cutoffDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cancelar todas las deudas hasta:</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full pl-3 text-left font-normal justify-start", !field.value && "text-muted-foreground")}
                                >
                                    {field.value ? capitalize(format(field.value, "EEEE, dd/MM/yyyy", { locale: es })) : <span>Seleccione una fecha</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" variant="destructive">Confirmar y Saldar Cuentas</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


// Consolidated Debt Dialog Component
const ConsolidatedDebtDialog = ({ isOpen, onClose, client, sales, toast }: { isOpen: boolean, onClose: () => void, client: Client, sales: Sale[], toast: any }) => {
  const [dateRange, setDateRange] = React.useState('all');

  const transactions = React.useMemo(() => {
    const allTransactions = sales.flatMap(sale => {
      const initialPaymentAmount = sale.payments
        .filter(p => p.date === sale.date)
        .reduce((sum, p) => sum + p.amount, 0);

      const saleTransaction = {
        date: sale.date,
        description: `Venta (${sale.quantity} ${sale.unit})`,
        debit: sale.totalAmount,
        credit: initialPaymentAmount,
      };
      
      const subsequentPayments = sale.payments
        .filter(p => p.date !== sale.date)
        .map(p => ({
          date: p.date,
          description: 'Abono',
          debit: 0,
          credit: p.amount,
        }));
        
      return [saleTransaction, ...subsequentPayments];
    }).sort((a, b) => {
        const dateA = parseISO(a.date).getTime();
        const dateB = parseISO(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return b.debit - a.debit;
    });

    const now = new Date();
    let startDate: Date | null = null;
    if (dateRange === 'lastWeek') startDate = subDays(now, 7);
    if (dateRange === 'lastMonth') startDate = subMonths(now, 1);
    if (dateRange === 'last6Months') startDate = subMonths(now, 6);
    if (dateRange === 'lastYear') startDate = subYears(now, 1);

    if (!startDate) {
        let runningBalance = 0;
        return allTransactions.map(t => {
            runningBalance += t.debit - t.credit;
            return { ...t, balance: runningBalance };
        });
    }

    let openingBalance = 0;
    const transactionsInRange: any[] = [];

    allTransactions.forEach(t => {
        if (parseISO(t.date) < startDate!) {
            openingBalance += t.debit - t.credit;
        } else {
            transactionsInRange.push(t);
        }
    });
    
    let runningBalance = openingBalance;
    const processedTransactions = transactionsInRange.map(t => {
        runningBalance += t.debit - t.credit;
        return { ...t, balance: runningBalance };
    });

    if (openingBalance !== 0 || processedTransactions.length > 0) {
        return [
            {
                date: format(startDate, "yyyy-MM-dd"),
                description: "Saldo Anterior",
                debit: 0,
                credit: 0,
                balance: openingBalance,
                isOpeningBalance: true,
            },
            ...processedTransactions,
        ];
    }
    
    return [];

  }, [sales, dateRange]);
  
  const handleExportConsolidatedToPDF = React.useCallback(async () => {
    const { default: jsPDFConstructor } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDFConstructor() as jsPDFWithAutoTable;
    
    const title = `Estado de Cuenta Consolidado - ${client.name}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 20);

    const tableHeaders = ['Fecha', 'Descripción', 'Cargo', 'Abono', 'Saldo'];
    const tableBody = transactions.map(t => {
        if (t.isOpeningBalance) {
            return [
                capitalize(format(parseISO(t.date), "EEEE, dd/MM", { locale: es })),
                t.description,
                '',
                '',
                `S/. ${t.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            ];
        }
        return [
            capitalize(format(parseISO(t.date), "EEEE, dd/MM", { locale: es })),
            t.description,
            t.debit > 0 ? `S/. ${t.debit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-',
            t.credit > 0 ? `S/. ${t.credit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-',
            `S/. ${t.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        ]
    });

    const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 28,
      foot: [
        ['', '', '', 'Saldo Final:', `S/. ${finalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]
      ],
      footStyles: { fontStyle: 'bold', halign: 'right' },
       columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right'},
          4: { halign: 'right'},
      }
    });

    doc.save(`consolidado_${client.name.replace(/\s/g, '_')}.pdf`);
    toast({
      title: "Exportación PDF Exitosa",
      description: "El estado de cuenta consolidado se ha exportado a PDF.",
    });
  }, [client, transactions, toast]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-left">
                  <DialogTitle>Consolidado de Deuda: {client.name}</DialogTitle>
                  <DialogDescription>
                      Historial de todas las deudas y pagos ordenados por fecha.
                  </DialogDescription>
              </div>
              <Select onValueChange={setDateRange} value={dateRange}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por fecha" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todo el Historial</SelectItem>
                      <SelectItem value="lastWeek">Últimos 7 días</SelectItem>
                      <SelectItem value="lastMonth">Último Mes</SelectItem>
                      <SelectItem value="last6Months">Últimos 6 Meses</SelectItem>
                      <SelectItem value="lastYear">Último Año</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] border rounded-md whitespace-nowrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cargo</TableHead>
                <TableHead className="text-right">Abono</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? transactions.map((t, index) => (
                 <TableRow key={index} className={cn(t.isOpeningBalance && "bg-muted/50 font-semibold")}>
                    <TableCell>{capitalize(format(parseISO(t.date), "EEEE, dd/MM", { locale: es }))}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell className="text-right font-mono">{!t.isOpeningBalance && t.debit > 0 ? `S/. ${t.debit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-green-500">{!t.isOpeningBalance && t.credit > 0 ? `S/. ${t.credit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}</TableCell>
                    <TableCell className="text-right font-mono font-medium">S/. {t.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                 </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No hay transacciones para el período seleccionado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <DialogFooter className="pt-4">
           <Button onClick={handleExportConsolidatedToPDF} variant="outline" disabled={transactions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exportar a PDF
            </Button>
            <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
