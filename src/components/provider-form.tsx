
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
import { Building, MapPin, Phone, DollarSign, Save, XCircle } from "lucide-react";
import type { Provider } from "@/types";

const providerFormSchema = z.object({
  name: z.string().min(1, "El nombre del proveedor es obligatorio.").max(100, "El nombre debe tener 100 caracteres o menos."),
  address: z.string().min(1, "La dirección es obligatoria.").max(200, "La dirección debe tener 200 caracteres o menos."),
  phone: z.string().min(1, "El número de teléfono es obligatorio.").max(20, "El teléfono debe tener 20 caracteres o menos.")
    .regex(/^[\d\s()+-]*$/, "El número de teléfono contiene caracteres inválidos."),
  price: z.coerce
    .number({ invalid_type_error: "El precio debe ser un número." })
    .positive({ message: "El precio debe ser un número positivo." })
    .min(0.01, {message: "El precio debe ser mayor que cero."}),
});

export type ProviderFormData = z.infer<typeof providerFormSchema>;

interface ProviderFormProps {
  onSubmit: (data: ProviderFormData) => void;
  onCancel: () => void;
  initialData?: Omit<Provider, 'id'>;
  isEditing?: boolean;
}

const ProviderForm: React.FC<ProviderFormProps> = ({ onSubmit, onCancel, initialData, isEditing }) => {
  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      phone: "",
      price: 0,
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({ name: "", address: "", phone: "", price: undefined }); // Reset price to undefined for placeholder
    }
  }, [initialData, form]);


  const handleSubmit = (data: ProviderFormData) => {
    onSubmit(data);
    // form.reset(); // Removed to keep form populated on error or for quick re-entry logic if needed
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
                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                Nombre del Proveedor
              </FormLabel>
              <FormControl>
                <Input placeholder="Ej: Alimentos Globales S.A." {...field} />
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
                <Textarea placeholder="Ej: Calle Principal 123, Ciudad" {...field} rows={3}/>
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
                <Input placeholder="Ej: (555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center font-semibold">
                <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                Precio Unitario
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="Ej: 10.50" 
                  step="0.01" 
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
            <Save className="mr-2 h-5 w-5" /> {isEditing ? 'Guardar Cambios' : 'Agregar Proveedor'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProviderForm;
