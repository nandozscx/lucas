"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProvidersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/registry');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Esta sección ahora está en "Operaciones". Redirigiendo...</p>
      </div>
    </div>
  );
}
