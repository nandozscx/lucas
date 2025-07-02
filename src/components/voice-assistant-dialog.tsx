"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { registerDeliveriesFromText, type RegisterDeliveriesInput } from '@/ai/flows/register-deliveries-flow';
import { createProviderFromText, type CreateProviderInput } from '@/ai/flows/create-provider-flow';
import { parseISO } from 'date-fns';

interface VoiceAssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  providers: string[];
  onDeliveriesComplete: (data: { date: Date; entries: { providerName: string; quantity: number }[] }) => void;
  onProviderCreate: (data: { name: string; price: number; address: string; phone: string }) => void;
}

export const VoiceAssistantDialog: React.FC<VoiceAssistantDialogProps> = ({ isOpen, onClose, providers, onDeliveriesComplete, onProviderCreate }) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setStatus('error');
      if(isOpen){
        toast({
            title: "Navegador no compatible",
            description: "Tu navegador no soporta el reconocimiento de voz.",
            variant: "destructive",
        });
      }
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'es-ES';
    recognition.interimResults = true;

    recognition.onstart = () => {
      setStatus('listening');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus('processing');
    };
    
    recognition.onerror = (event) => {
      if (event.error === 'network') {
        console.warn('Speech recognition network error:', event.error);
        toast({
          title: "Error de Red",
          description: "No se pudo conectar al servicio de voz. Por favor, revisa tu conexión a internet.",
          variant: "destructive",
        });
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error', event.error);
        setStatus('error');
        toast({
            title: "Error de Reconocimiento",
            description: `Ocurrió un error: ${event.error}`,
            variant: "destructive",
        });
      }
      
      setIsListening(false);
      setStatus('idle');
    };

    recognitionRef.current = recognition;
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (status === 'processing' && transcript.trim()) {
        handleProcessTranscript(transcript);
    } else if (status === 'processing') {
        setStatus('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, transcript]);


  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
    }
  };

  const handleProcessTranscript = async (text: string) => {
    if (!text.trim()) {
        setStatus('idle');
        return;
    }
    
    try {
      if (text.toLowerCase().includes('proveedor')) {
        const input: CreateProviderInput = { query: text };
        const result = await createProviderFromText(input);

        if (result && result.name) {
          onProviderCreate(result);
          toast({
            title: "Proveedor Creado por Voz",
            description: `Se ha creado el proveedor "${result.name}".`,
          });
          onClose();
        } else {
          throw new Error("No se pudo extraer la información del proveedor del texto.");
        }
      } else {
        const input: RegisterDeliveriesInput = {
          query: text,
          providerNames: providers,
        };
        
        const result = await registerDeliveriesFromText(input);

        if (result && result.entries.length > 0) {
          const formattedEntries = result.entries.map(entry => ({
              providerName: entry.providerName,
              quantity: entry.quantity,
          }));
          
          onDeliveriesComplete({
              date: parseISO(result.date),
              entries: formattedEntries,
          });

          onClose();
        } else {
          throw new Error("No se pudo extraer ninguna entrega del texto.");
        }
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      toast({
        title: "Error al Procesar",
        description: "No pude entender tu solicitud. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
        setStatus('idle');
    }
  };

  useEffect(() => {
    return () => {
        if(recognitionRef.current && isListening) {
            recognitionRef.current.abort();
        }
    }
  }, [isListening])
  
  const getStatusMessage = () => {
      switch (status) {
          case 'listening': return 'Escuchando...';
          case 'processing': return 'Procesando tu solicitud...';
          case 'error': return 'Hubo un error. Inténtalo de nuevo.';
          default: return 'Presiona el micrófono y habla.';
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onInteractOutside={(e) => {if(isListening) e.preventDefault()}}>
        <DialogHeader>
          <DialogTitle>Asistente de Voz para Registro</DialogTitle>
          <DialogDescription>
            Puedes registrar entregas ("Registra 30 para Don Lucio") o crear proveedores ("Añadir proveedor Brigida...").
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Button
                size="icon"
                className={`h-24 w-24 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary'}`}
                onClick={toggleListening}
                disabled={status === 'processing' || status === 'error'}
            >
                {status === 'processing' ? (
                    <Loader2 className="h-10 w-10 animate-spin"/>
                ) : isListening ? (
                    <MicOff className="h-10 w-10"/>
                ) : (
                    <Mic className="h-10 w-10"/>
                )}
            </Button>
            <p className="text-muted-foreground text-sm min-h-[20px]">
                {getStatusMessage()}
            </p>
            {transcript && (
                <p className="text-center font-medium p-4 border rounded-md bg-muted/50 w-full">
                    {transcript}
                </p>
            )}
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
