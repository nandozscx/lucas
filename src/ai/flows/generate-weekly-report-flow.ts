'use server';
/**
 * @fileOverview An AI flow to generate a weekly business report.
 *
 * - generateWeeklyReport - A function that handles the report generation.
 */

import { ai } from '@/ai/genkit';
import type { WeeklyReportInput, WeeklyReportOutput } from '@/types';
import { WeeklyReportInputSchema, WeeklyReportOutputSchema } from '@/types';


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
    Use the data from the previous weeks' sales only to calculate the sales trend.

    Here is the data for the week:
    - Providers: {{{json providers}}}
    - Deliveries: {{{json deliveries}}}
    - Production: {{{json production}}}
    - Sales: {{{json sales}}}
    - All Whole Milk Replenishments: {{{json wholeMilkReplenishments}}}
    - Sales from previous 4 weeks: {{{json previousWeeksSales}}}

    Based on this data, provide the following information in Spanish:

    1.  **summary**: A 1-2 sentence overview of the week. Mention total raw material received, total units produced, and the average transformation index.
    2.  **topProvider**: 
        - Find the provider who delivered the most raw material (sum of quantities). 
        - Set **topProviderName** to their exact name from the data.
        - Create the **topProviderSummary** string stating their name and the total quantity in liters. Format: 'NombreProveedor: XXXX L'
    3.  **topClient**: 
        - Find the client with the highest total sales amount for the week. 
        - Set **topClientName** to their exact name from the data.
        - Create the **topClientSummary** string stating their name and the total amount in S/. Format: 'NombreCliente: S/. XXXX.XX'
    4.  **stockStatus**: 
        - Calculate the current whole milk stock. Sum all 'quantitySacos' from 'wholeMilkReplenishments' to get total stock ever. Sum all 'wholeMilkKilos' used from 'production' records (for all time, which is what's provided in the production array) and divide by 25 to get total sacos used. The current stock is total stock - total used. 
        - Create the **stockStatusSummary** string stating the final number of 'sacos' remaining. E.g., 'X sacos restantes.'
    5.  **salesTrend**: 
        - Calculate the total sales amount for the current week and for the previous weeks. 
        - Determine the percentage increase or decrease from the average of the last 4 weeks. The formula for percentage change is ((current - average_previous) / average_previous) * 100. If previous weeks' sales are zero, state that no comparison is possible.
        - Create the **salesTrendSummary** string describing this trend. E.g., 'Las ventas aumentaron un X%...' or 'Las ventas disminuyeron un X%...'
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
