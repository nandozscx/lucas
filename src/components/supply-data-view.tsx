
"use client";

import React from 'react';
import type { Delivery, VendorTotal } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ListOrdered, Users, CalendarDays, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SupplyDataViewProps {
  deliveries: Delivery[];
  dailyTotals: Record<string, number>;
  vendorTotals: VendorTotal[];
  onDeleteDelivery: (id: string) => void;
}

const SupplyDataView: React.FC<SupplyDataViewProps> = ({ deliveries, dailyTotals, vendorTotals, onDeleteDelivery }) => {
  const sortedDeliveries = [...deliveries].sort((a, b) => {
    const dateComparison = parseISO(b.date).getTime() - parseISO(a.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    return a.providerName.localeCompare(b.providerName);
  });

  const sortedDailyTotals = Object.entries(dailyTotals).sort(([dateA], [dateB]) => 
    parseISO(dateB).getTime() - parseISO(dateA).getTime()
  );

  const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-10 border border-dashed rounded-md">
      <Info className="h-12 w-12 mb-3 opacity-50" />
      <p className="text-lg font-medium">No Data Available</p>
      <p className="text-sm">{message}</p>
    </div>
  );
  
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Supply Records</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="allDeliveries" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
            <TabsTrigger value="allDeliveries" className="flex items-center gap-2 text-sm sm:text-base">
              <ListOrdered className="h-4 w-4 sm:h-5 sm:w-5"/> All Deliveries
            </TabsTrigger>
            <TabsTrigger value="dailyTotals" className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5"/> Daily Totals
            </TabsTrigger>
            <TabsTrigger value="vendorTotals" className="flex items-center gap-2 text-sm sm:text-base">
              <Users className="h-4 w-4 sm:h-5 sm:w-5"/> Vendor Totals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allDeliveries">
            {sortedDeliveries.length === 0 ? (
              <EmptyState message="No deliveries have been recorded yet. Add one using the form." />
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Provider</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="text-right font-semibold">Quantity</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDeliveries.map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell className="font-medium">{delivery.providerName}</TableCell>
                        <TableCell>{format(parseISO(delivery.date), "PP")}</TableCell>
                        <TableCell className="text-right">{delivery.quantity.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => onDeleteDelivery(delivery.id)} aria-label={`Delete delivery from ${delivery.providerName} on ${format(parseISO(delivery.date), "PP")}`}>
                            <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 {sortedDeliveries.length > 5 && <TableCaption>Scroll for more entries.</TableCaption>}
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="dailyTotals">
             {sortedDailyTotals.length === 0 ? (
              <EmptyState message="Daily totals will appear here once deliveries are added." />
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="text-right font-semibold">Total Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedDailyTotals.map(([date, total]) => (
                      <TableRow key={date}>
                        <TableCell className="font-medium">{format(parseISO(date), "PP")}</TableCell>
                        <TableCell className="text-right">{total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {sortedDailyTotals.length > 5 && <TableCaption>Scroll for more entries.</TableCaption>}
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="vendorTotals">
            {vendorTotals.length === 0 ? (
              <EmptyState message="Vendor totals will be calculated and displayed here." />
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Provider</TableHead>
                      <TableHead className="text-right font-semibold">Total Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorTotals.map((vendor) => (
                      <TableRow key={vendor.originalName}>
                        <TableCell className="font-medium">{vendor.originalName}</TableCell>
                        <TableCell className="text-right">{vendor.totalQuantity.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {vendorTotals.length > 5 && <TableCaption>Scroll for more entries.</TableCaption>}
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SupplyDataView;
