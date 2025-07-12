import { z } from 'zod';

export interface Delivery {
  id: string;
  providerName: string; // Consider changing to providerId if linking directly
  date: string; // YYYY-MM-DD format
  quantity: number;
}

export interface VendorTotal {
  originalName: string; // To keep the exact name used in entries
  totalQuantity: number;
}

export interface Provider {
  id: string;
  name: string;
  address: string;
  phone: string;
  price: number; // Precio unitario al que se le compra al proveedor
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface Payment {
  date: string; // YYYY-MM-DD format
  amount: number;
}

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD format
  clientId: string;
  clientName: string; // Denormalized for easier display
  price: number;
  quantity: number;
  unit: 'baldes' | 'unidades';
  deliveryType: 'personal' | 'envio';
  totalAmount: number;
  payments: Payment[];
}

export interface Production {
  id: string;
  date: string; // YYYY-MM-DD
  producedUnits: number;
  wholeMilkKilos: number; // Stored as kilos, can be 0
  rawMaterialLiters: number; // Base liters from deliveries on that day
  transformationIndex: number; // Percentage
}

export interface WholeMilk {
  stockSacos: number;
  pricePerSaco: number;
}

export interface WholeMilkReplenishment {
  id: string;
  date: string; // YYYY-MM-DD
  quantitySacos: number;
  pricePerSaco: number;
}


// Schema for locally generated Report Output
export interface WeeklyReportOutput {
  summary: string;
  topProviderSummary: string;
  topClientSummary: string;
  stockStatusSummary: string;
  salesTrendSummary: string;
}