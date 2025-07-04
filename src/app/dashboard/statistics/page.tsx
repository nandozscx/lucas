"use client";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function StatisticsPage() {
  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 bg-background">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-6 p-4 bg-card shadow-md rounded-lg gap-4">
            <Link href="/dashboard" className="flex items-center text-primary hover:underline text-sm mb-4 sm:mb-0 self-start sm:self-center">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver al Panel
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center order-first sm:order-none mx-auto sm:mx-0">
                <BarChart3 className="mr-3 h-8 w-8" />
                Estadísticas
            </h1>
            <div className="w-0 sm:w-auto"></div>
        </header>
        <main className="flex-grow flex items-center justify-center">
            <p className="text-muted-foreground">Página de estadísticas - Próximamente.</p>
        </main>
    </div>
  );
}
