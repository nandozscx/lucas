
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
import type { Delivery } from "@/types";

const deliveryFormSchema = z.object({
  providerName: z.string().min(1, "Provider name is required.").max(100, "Provider name must be 100 characters or less."),
  date: z.date({ required_error: "Delivery date is required." }),
  quantity: z.coerce.number().positive({ message: "Quantity must be a positive number." }),
});

type DeliveryFormData = z.infer<typeof deliveryFormSchema>;

interface SupplyEntryFormProps {
  onAddDelivery: (delivery: Omit<Delivery, 'id'>) => void;
}

const SupplyEntryForm: React.FC<SupplyEntryFormProps> = ({ onAddDelivery }) => {
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
      providerName: data.providerName.trim(),
      date: format(data.date, "yyyy-MM-dd"),
      quantity: data.quantity,
    });
    form.reset();
    form.setValue("date", new Date()); // Explicitly reset date to today after successful submission
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-primary">
          <PackagePlus className="mr-2 h-6 w-6" /> Add New Delivery
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
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center font-semibold">
                     <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                     Delivery Date
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
                            <span>Pick a date</span>
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
                    Quantity
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
              <PackagePlus className="mr-2 h-5 w-5" /> Add Delivery
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default SupplyEntryForm;
