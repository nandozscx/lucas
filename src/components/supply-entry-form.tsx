
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CalendarIcon, PackagePlus, Building, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Delivery, Provider } from "@/types";

const deliveryFormSchema = z.object({
  providerName: z.string().min(1, "El nombre del proveedor es obligatorio."),
  date: z.date({ required_error: "La fecha de entrega es obligatoria." }),
  quantity: z.coerce.number().positive({ message: "La cantidad debe ser un número positivo." }),
});

type DeliveryFormData = z.infer<typeof deliveryFormSchema>;

interface SupplyEntryFormProps {
  onAddDelivery: (delivery: Omit<Delivery, 'id'>) => void;
  providers: Provider[];
}

const SupplyEntryForm: React.FC<SupplyEntryFormProps> = ({ onAddDelivery, providers }) => {
  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      providerName: "",
      date: new Date(), // Default to today
      quantity: undefined, // Use undefined for number input to allow placeholder
    },
  });

  const onSubmit = (data: DeliveryFormData) => {
    onAddDelivery({
      providerName: data.providerName, // providerName is now directly from select
      date: format(data.date, "yyyy-MM-dd"),
      quantity: data.quantity,
    });
    form.reset({ providerName: "", quantity: undefined, date: new Date() });
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <PackagePlus className="mr-2 h-6 w-6" /> Registrar Nueva Entrega
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="providerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-semibold">
                    <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                    Proveedor
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.name}>
                          {provider.name}
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
                  <FormLabel className="flex items-center font-semibold">
                     <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                     Fecha de Entrega
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal justify-start",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP") // e.g. Aug 23, 2023
                          ) : (
                            <span>Seleccione una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-semibold">
                    <Boxes className="mr-2 h-4 w-4 text-muted-foreground" />
                    Cantidad
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 150.5" {...field} step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              <PackagePlus className="mr-2 h-5 w-5" /> Registrar Entrega
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default SupplyEntryForm;

