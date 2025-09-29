"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { User, MapPin, Phone, Save, XCircle, DollarSign } from "lucide-react";
import type { Client } from "@/types";

const clientFormSchema = z.object({
  name: z.string().min(1, "El nombre del cliente es obligatorio.").max(100, "El nombre debe tener 100 caracteres o menos."),
  address: z.string().min(1, "La dirección es obligatoria.").max(200, "La dirección debe tener 200 caracteres o menos."),
  phone: z.string().min(1, "El número de teléfono es obligatorio.").max(20, "El teléfono debe tener 20 caracteres o menos.")
    .regex(/^[\d\s()+-]*$/, "El número de teléfono contiene caracteres inválidos."),
  salePrice: z.coerce
    .number({ invalid_type_error: "El precio debe ser un número." })
    .positive({ message: "El precio debe ser un número positivo." })
    .min(0.01, { message: "El precio debe ser mayor que cero." }),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
  initialData?: Omit<Client, 'id'>;
  isEditing?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, onCancel, initialData, isEditing }) => {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      phone: "",
      salePrice: undefined,
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({ name: "", address: "", phone: "", salePrice: undefined });
    }
  }, [initialData, form]);

  const handleSubmit = (data: ClientFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center font-semibold">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                Nombre del Cliente
              </FormLabel>
              <FormControl>
                <Input placeholder="Ej: Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center font-semibold">
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                Dirección
              </FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Av. Siempreviva 742" {...field} rows={3}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center font-semibold">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                Número de Teléfono
              </FormLabel>
              <FormControl>
                <Input placeholder="Ej: (555) 987-6543" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="salePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center font-semibold">
                <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                Precio de Venta Predeterminado
              </FormLabel>
              <FormControl>
                 <Input 
                  type="number" 
                  placeholder="Ej: 1.75" 
                  {...field} 
                  value={field.value === undefined ? '' : field.value}
                  onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <XCircle className="mr-2 h-5 w-5" /> Cancelar
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            <Save className="mr-2 h-5 w-5" /> {isEditing ? 'Guardar Cambios' : 'Agregar Cliente'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ClientForm;
