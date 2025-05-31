
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, History, Search } from 'lucide-react'; // Using History as the main icon for the page
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HistoryPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
        <header className="flex items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-36" />
        </header>
        <main className="flex-grow space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
        </main>
        <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
          <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 bg-background">
      <header className="flex flex-col sm:flex-row items-center justify-between mb-6 md:mb-10 p-4 bg-card shadow-md rounded-lg gap-4">
        <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver al Panel
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
          <History className="mr-3 h-8 w-8" /> Historial de Entregas
        </h1>
        <div className="w-0 sm:w-auto"></div> {/* Spacer for alignment */}
      </header>

      <main className="flex-grow flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-xl text-center">
              <Search className="mr-2 h-6 w-6 text-primary" />
              Búsqueda Avanzada (Próximamente)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground space-y-4">
            <p>
              Aquí podrás buscar y filtrar registros de entregas anteriores por semana o por día.
            </p>
            <p className="text-sm">
              Esta funcionalidad está en desarrollo y estará disponible pronto.
            </p>
            <div className="mt-6">
                <History size={48} className="mx-auto text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </main>
      
      <footer className="text-center text-sm text-muted-foreground py-4 mt-auto">
        <p>&copy; {new Date().getFullYear()} Daily Supply Tracker. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
