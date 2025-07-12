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

// Zod Schemas for AI Report Flow
const AiProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
});

const AiDeliverySchema = z.object({
  id: z.string(),
  providerName: z.string(),
  date: z.string(),
  quantity: z.number(),
});

const AiProductionSchema = z.object({
  id: z.string(),
  date: z.string(),
  producedUnits: z.number(),
  wholeMilkKilos: z.number(),
  rawMaterialLiters: z.number(),
  transformationIndex: z.number(),
});

const AiSaleSchema = z.object({
  id: z.string(),
  date: z.string(),
  clientName: z.string(),
  totalAmount: z.number(),
  payments: z.array(z.object({ amount: z.number() })),
});

const AiWholeMilkReplenishmentSchema = z.object({
  quantitySacos: z.number(),
});

export const WeeklyReportInputSchema = z.object({
  deliveries: z.array(AiDeliverySchema).describe("List of raw material deliveries for the week."),
  providers: z.array(AiProviderSchema).describe("List of all available providers."),
  production: z.array(AiProductionSchema).describe("List of production records for the week."),
  sales: z.array(AiSaleSchema).describe("List of sales records for the week."),
  wholeMilkReplenishments: z.array(AiWholeMilkReplenishmentSchema).describe("History of all whole milk replenishments."),
  previousWeekSales: z.array(AiSaleSchema).describe("List of sales records for the previous week for comparison."),
});
export type WeeklyReportInput = z.infer<typeof WeeklyReportInputSchema>;

export const WeeklyReportOutputSchema = z.object({
  summary: z.string().describe("A general summary of the week's performance in Spanish."),
  topProvider: z.string().describe("Identifies the provider who delivered the most raw material this week. Format: 'NombreProveedor: XXXX L'"),
  topClient: z.string().describe("Identifies the client with the highest sales amount this week. Format: 'NombreCliente: S/. XXXX.XX'"),
  stockStatus: z.string().describe("A brief status of the whole milk stock in 'sacos'. E.g., 'X sacos restantes.'"),
  salesTrend: z.string().describe("Compares this week's sales with the previous week's and calculates the percentage change. E.g., 'Las ventas aumentaron un X%...' or 'Las ventas disminuyeron un X%...'"),
});
export type WeeklyReportOutput = z.infer<typeof WeeklyReportOutputSchema>;
