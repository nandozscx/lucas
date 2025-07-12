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

// Zod Schema for AI Report Flow Input
// This contains pre-calculated, accurate data for the AI to summarize.
export const WeeklyReportInputSchema = z.object({
  totalRawMaterial: z.number().describe("The total liters of raw material received this week."),
  totalUnitsProduced: z.number().describe("The total units produced this week."),
  avgTransformationIndex: z.number().describe("The average transformation index percentage for the week."),
  topProviderName: z.string().describe("The name of the provider who delivered the most material."),
  topProviderTotal: z.number().describe("The total quantity delivered by the top provider."),
  topClientName: z.string().describe("The name of the client with the highest sales amount."),
  topClientTotal: z.number().describe("The total sales amount for the top client."),
  stockInSacos: z.number().describe("The current final stock of whole milk in 'sacos'."),
  salesTrendPercentage: z.number().describe("The percentage change in sales compared to the previous 4 weeks."),
  isTrendComparisonPossible: z.boolean().describe("True if there is data from previous weeks to compare sales against."),
});
export type WeeklyReportInput = z.infer<typeof WeeklyReportInputSchema>;

// Zod Schema for AI Report Flow Output
// The AI is expected to return only narrative summaries based on the input data.
export const WeeklyReportOutputSchema = z.object({
  summary: z.string().describe("A general summary of the week's performance in Spanish, using the provided data points."),
  topProviderSummary: z.string().describe("A summary sentence in Spanish for the top provider. Example: 'ProveedorX fue el más destacado con XXXX.XX L.'"),
  topClientSummary: z.string().describe("A summary sentence in Spanish for the top client. Example: 'ClienteY fue el principal con S/. XXXX.XX en ventas.'"),
  stockStatusSummary: z.string().describe("A brief status of the whole milk stock in 'sacos'. E.g., 'Quedan X.XX sacos restantes.'"),
  salesTrendSummary: z.string().describe("Describes the sales trend in Spanish based on the percentage. E.g., 'Las ventas aumentaron un X.XX%...' or 'No hay datos previos para comparar.'"),
});
export type WeeklyReportOutput = z.infer<typeof WeeklyReportOutputSchema>;
