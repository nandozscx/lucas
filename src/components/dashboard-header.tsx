
"use client";
import React from 'react';
import type { Delivery } from '@/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface DashboardHeaderProps {
  deliveries: Delivery[];
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ deliveries }) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (deliveries.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = "Provider,Date,Quantity\n";
    const csvRows = deliveries.map(d => 
      // Ensure CSV safety: double quotes for fields, escape internal double quotes
      `"${d.providerName.replace(/"/g, '""')}","${d.date}",${d.quantity}`
    );
    const csvContent = headers + csvRows.join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "supply_deliveries.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up the object URL
      toast({
        title: "Export Successful",
        description: "Deliveries exported to CSV.",
      });
    } else {
       toast({
        title: "Export Failed",
        description: "Your browser does not support direct downloads.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between p-4 bg-card shadow-md rounded-lg gap-4 sm:gap-0">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">Daily Supply Tracker</h1>
      <Button onClick={exportToCSV} variant="outline" className="bg-accent text-accent-foreground hover:bg-accent/90">
        <Download className="mr-2 h-5 w-5" />
        Export to CSV
      </Button>
    </header>
  );
};

export default DashboardHeader;
