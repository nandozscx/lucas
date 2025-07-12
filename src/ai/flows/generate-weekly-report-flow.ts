'use server';
/**
 * @fileOverview An AI flow to generate a weekly business report.
 *
 * - generateWeeklyReport - A function that handles the report generation.
 * - WeeklyReportInput - The input type for the generateWeeklyReport function.
 * - WeeklyReportOutput - The return type for the generateWeeklyReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
});

const DeliverySchema = z.object({
  id: z.string(),
  providerName: z.string(),
  date: z.string(),
  quantity: z.number(),
});

const ProductionSchema = z.object({
  id: z.string(),
  date: z.string(),
  producedUnits: z.number(),
  wholeMilkKilos: z.number(),
  rawMaterialLiters: z.number(),
  transformationIndex: z.number(),
});

const SaleSchema = z.object({
  id: z.string(),
  date: z.string(),
  clientName: z.string(),
  totalAmount: z.number(),
  payments: z.array(z.object({ amount: z.number() })),
});

const WholeMilkReplenishmentSchema = z.object({
  quantitySacos: z.number(),
});

export const WeeklyReportInputSchema = z.object({
  deliveries: z.array(DeliverySchema).describe("List of raw material deliveries for the week."),
  providers: z.array(ProviderSchema).describe("List of all available providers."),
  production: z.array(ProductionSchema).describe("List of production records for the week."),
  sales: z.array(SaleSchema).describe("List of sales records for the week."),
  wholeMilkReplenishments: z.array(WholeMilkReplenishmentSchema).describe("History of all whole milk replenishments."),
  previousWeekSales: z.array(SaleSchema).describe("List of sales records for the previous week for comparison."),
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

export async function generateWeeklyReport(input: WeeklyReportInput): Promise<WeeklyReportOutput> {
  return generateWeeklyReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weeklyReportPrompt',
  input: { schema: WeeklyReportInputSchema },
  output: { schema: WeeklyReportOutputSchema },
  prompt: `
    You are a business analyst for a small dairy production company called "acopiapp". 
    Your task is to generate a concise weekly report in Spanish based on the JSON data provided.

    Analyze the data for deliveries, production, and sales for the current week.
    Use the data from the previous week's sales only to calculate the sales trend.

    Here is the data for the week:
    - Providers: {{{json providers}}}
    - Deliveries: {{{json deliveries}}}
    - Production: {{{json production}}}
    - Sales: {{{json sales}}}
    - All Whole Milk Replenishments: {{{json wholeMilkReplenishments}}}
    - Previous Week Sales: {{{json previousWeekSales}}}

    Based on this data, provide the following information in Spanish:

    1.  **summary**: A 1-2 sentence overview of the week. Mention total raw material received, total units produced, and the average transformation index.
    2.  **topProvider**: Find the provider who delivered the most raw material (sum of quantities). State their name and the total quantity in liters.
    3.  **topClient**: Find the client with the highest total sales amount for the week. State their name and the total amount in S/.
    4.  **stockStatus**: Calculate the current whole milk stock. Sum all 'quantitySacos' from 'wholeMilkReplenishments' to get total stock ever. Sum all 'wholeMilkKilos' used from 'production' records (for all time, which is what's provided in the production array) and divide by 25 to get total sacos used. The current stock is total stock - total used. State the final number of 'sacos' remaining.
    5.  **salesTrend**: Calculate the total sales amount for the current week and the previous week. Determine the percentage increase or decrease. The formula for percentage change is ((current - previous) / previous) * 100. If previous week's sales are zero, state that no comparison is possible.
  `,
});

const generateWeeklyReportFlow = ai.defineFlow(
  {
    name: 'generateWeeklyReportFlow',
    inputSchema: WeeklyReportInputSchema,
    outputSchema: WeeklyReportOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("The AI model did not return a valid report.");
    }
    return output;
  }
);
