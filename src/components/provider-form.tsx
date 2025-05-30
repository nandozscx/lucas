
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Using Textarea for address
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Building, MapPin, Phone, Save, XCircle } from "lucide-react";
import type { Provider } from "@/types";

const providerFormSchema = z.object({
  name: z.string().min(1, "Provider name is required.").max(100, "Name must be 100 characters or less."),
  address: z.string().min(1, "Address is required.").max(200, "Address must be 200 characters or less."),
  phone: z.string().min(1, "Phone number is required.").max(20, "Phone must be 20 characters or less.")
    .regex(/^[\d\s()+-]*$/, "Phone number contains invalid characters."),
});

export type ProviderFormData = z.infer<typeof providerFormSchema>;

interface ProviderFormProps {
  onSubmit: (data: ProviderFormData) => void;
  onCancel: () => void;
  initialData?: Omit<Provider, 'id'>; // For editing, id is handled separately
  isEditing?: boolean;
}

const ProviderForm: React.FC<ProviderFormProps> = ({ onSubmit, onCancel, initialData, isEditing }) => {
  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      phone: "",
    },
  });

  React.useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({ name: "", address: "", phone: "" });
    }
  }, [initialData, form]);


  const handleSubmit = (data: ProviderFormData) => {
    onSubmit(data);
    form.reset(); // Reset form after submission
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
                Provider Name
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Global Foods Ltd." {...field} />
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
                Address
              </FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. 123 Main St, Anytown, USA" {...field} rows={3}/>
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
                Phone Number
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. (555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <XCircle className="mr-2 h-5 w-5" /> Cancel
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            <Save className="mr-2 h-5 w-5" /> {isEditing ? 'Save Changes' : 'Add Provider'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProviderForm;
