
"use client";

import React, { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
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
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { CalendarIcon, PackagePlus, Building, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Provider } from "@/types";

const dailyEntrySchema = z.object({
  providerId: z.string(), // Keep providerId for potential future linking
  providerName: z.string(),
  quantity: z.coerce
    .number({ invalid_type_error: "Debe ser un número." })
    .min(0, { message: "La cantidad no puede ser negativa." })
    .optional()
    .or(z.literal(undefined))
    .or(z.literal('')),
});

const dailyRegistrySchema = z.object({
  date: z.date({ required_error: "La fecha de entrega es obligatoria." }),
  entries: z.array(dailyEntrySchema),
});

export type DailyRegistryFormData = z.infer<typeof dailyRegistrySchema>;

interface SupplyEntryFormProps {
  onSubmitDeliveries: (data: DailyRegistryFormData) => void;
  providers: Provider[];
}

const SupplyEntryForm: React.FC<SupplyEntryFormProps> = ({ onSubmitDeliveries, providers }) => {
  const form = useForm<DailyRegistryFormData>({
    resolver: zodResolver(dailyRegistrySchema),
    defaultValues: {
      date: new Date(),
      entries: providers.map(p => ({ providerId: p.id, providerName: p.name, quantity: undefined }))
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  const selectedDate = form.watch("date");

  useEffect(() => {
    form.reset({
      date: form.getValues("date") || new Date(),
      entries: providers.map(p => ({ providerId: p.id, providerName: p.name, quantity: undefined }))
    });
  }, [providers, form]);

  const handleSubmit = (data: DailyRegistryFormData) => {
    onSubmitDeliveries(data);
    form.reset({
      date: data.date, 
      entries: providers.map(p => ({ providerId: p.id, providerName: p.name, quantity: undefined }))
    });
  };
  
  const getDayName = (date: Date | undefined): string => {
    if (!date) return "";
    return format(date, "EEEE", { locale: es });
  };

  const getDateNumber = (date: Date | undefined): string => {
    if (!date) return "";
    return format(date, "d", { locale: es });
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <PackagePlus className="mr-2 h-6 w-6" /> 
          <span>Registro para el {getDayName(selectedDate)} {getDateNumber(selectedDate)}</span>
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
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
                            format(field.value, "PPP", { locale: es }) 
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
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel className="flex items-center font-semibold">
                <Boxes className="mr-2 h-4 w-4 text-muted-foreground" />
                Cantidades por Proveedor
              </FormLabel>
              {fields.map((item, index) => (
                <FormField
                  key={item.id} // react-hook-form field array key
                  control={form.control}
                  name={`entries.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor={`entries.${index}.quantity`} className="text-sm font-medium text-muted-foreground flex items-center">
                        <Building className="mr-2 h-3 w-3 text-muted-foreground opacity-70" /> 
                        {form.getValues(`entries.${index}.providerName`)}
                      </FormLabel>
                      <FormControl>
                        <Input
                          id={`entries.${index}.quantity`}
                          type="number"
                          placeholder="Cantidad (ej. 150.5)"
                          {...field}
                          value={field.value === undefined || field.value === null ? '' : field.value} // Handle undefined for controlled input
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              <PackagePlus className="mr-2 h-5 w-5" /> Registrar Entregas del Día
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default SupplyEntryForm;
