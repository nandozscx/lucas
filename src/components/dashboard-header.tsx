
"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface DashboardHeaderProps {
  onExportCSV: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onExportCSV }) => {

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between p-4 bg-card shadow-md rounded-lg gap-4 sm:gap-0">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">Daily Supply Tracker</h1>
      <Button onClick={onExportCSV} variant="outline" className="bg-accent text-accent-foreground hover:bg-accent/90">
        <Download className="mr-2 h-5 w-5" />
        Exportar a CSV
      </Button>
    </header>
  );
};

export default DashboardHeader;
