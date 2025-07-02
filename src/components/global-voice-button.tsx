"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceAssistantDialog } from '@/components/voice-assistant-dialog';
import { Mic } from 'lucide-react';
import type { Delivery, Provider } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DELIVERIES_STORAGE_KEY = 'dailySupplyTrackerDeliveries';
const PROVIDERS_STORAGE_KEY = 'dailySupplyTrackerProviders';

export const GlobalVoiceButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [providers, setProviders] = useState<Provider[]>([]);
    const { toast } = useToast();

    const loadProviders = useCallback(() => {
        const storedProviders = localStorage.getItem(PROVIDERS_STORAGE_KEY);
        if (storedProviders) {
            try {
                const parsedProviders = JSON.parse(storedProviders);
                if (Array.isArray(parsedProviders)) {
                    setProviders(parsedProviders);
                }
            } catch (e) {
                console.error("Failed to parse providers from localStorage", e);
                setProviders([]);
            }
        }
    }, []);

    useEffect(() => {
        loadProviders();
        window.addEventListener('storage-update', loadProviders);
        return () => {
            window.removeEventListener('storage-update', loadProviders);
        };
    }, [loadProviders]);

    const handleDeliveriesComplete = (data: { date: Date; entries: { providerName: string; quantity: number }[] }) => {
        const providerMap = new Map(providers.map(p => [p.name.toLowerCase(), p]));
        const dateStr = format(data.date, "yyyy-MM-dd");

        const mappedEntries = data.entries.map(voiceEntry => {
            const provider = providerMap.get(voiceEntry.providerName.toLowerCase());
            if (!provider) {
                toast({
                    title: "Proveedor Desconocido",
                    description: `El asistente de IA mencionó a "${voiceEntry.providerName}", pero no está en tu lista de proveedores. Se ha ignorado.`,
                    variant: "destructive"
                });
                return null;
            }
            return {
                id: crypto.randomUUID(),
                providerName: provider.name,
                date: dateStr,
                quantity: voiceEntry.quantity,
            };
        }).filter(Boolean) as Delivery[];

        if (mappedEntries.length > 0) {
            const storedDeliveries = localStorage.getItem(DELIVERIES_STORAGE_KEY);
            const currentDeliveries: Delivery[] = storedDeliveries ? JSON.parse(storedDeliveries) : [];
            
            const submittedProviderNames = new Set(mappedEntries.map(e => e.providerName));
            const otherDeliveries = currentDeliveries.filter(delivery => {
                return delivery.date !== dateStr || !submittedProviderNames.has(delivery.providerName);
            });

            const newDeliveries = [...otherDeliveries, ...mappedEntries];
            localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(newDeliveries));
            window.dispatchEvent(new CustomEvent('storage-update'));
            
            toast({
                title: "Entregas Registradas por Voz",
                description: `${mappedEntries.length} entrega(s) para el ${format(data.date, "PPP", { locale: es })} han sido registradas/actualizadas.`,
            });
        } else if (data.entries.length > 0) {
            toast({ title: "Sin coincidencias", description: "No se encontraron proveedores coincidentes para registrar.", variant: "destructive" });
        }
    };

    const handleProviderCreate = (data: { name: string; price: number; address: string; phone: string }) => {
        const existingProvider = providers.find(p => p.name.toLowerCase() === data.name.toLowerCase());
        if (existingProvider) {
            toast({
                title: "Proveedor Duplicado",
                description: `El proveedor "${data.name}" ya existe.`,
                variant: "destructive",
            });
            return;
        }

        const newProvider: Provider = {
            id: crypto.randomUUID(),
            name: data.name,
            address: data.address,
            phone: data.phone,
            price: data.price,
        };

        const updatedProviders = [...providers, newProvider];
        localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(updatedProviders));
        setProviders(updatedProviders);
        window.dispatchEvent(new CustomEvent('storage-update'));
    };
    
    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 flex items-center justify-center bg-accent hover:bg-accent/90"
                aria-label="Registrar por voz"
                title="Registrar por voz"
            >
                <Mic className="h-8 w-8" />
            </Button>

            <VoiceAssistantDialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                providers={providers.map(p => p.name)}
                onDeliveriesComplete={handleDeliveriesComplete}
                onProviderCreate={handleProviderCreate}
            />
        </>
    );
};
