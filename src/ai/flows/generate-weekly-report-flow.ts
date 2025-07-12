
'use server';
/**
 * @fileOverview An AI flow to generate a weekly business report summary.
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
    Your task is to generate a concise weekly report in Spanish based on the EXACT data provided.
    You MUST use the numbers provided without modification. Your only job is to create natural-sounding summary sentences.

    Here is the pre-calculated data for the week:
    - Total raw material received: {{{totalRawMaterial}}} L
    - Total units produced: {{{totalUnitsProduced}}} unidades
    - Average transformation index: {{{avgTransformationIndex}}}%
    - Top provider name: "{{{topProviderName}}}"
    - Top provider total: {{{topProviderTotal}}} L
    - Top client name: "{{{topClientName}}}"
    - Top client total: S/. {{{topClientTotal}}}
    - Final stock of whole milk: {{{stockInSacos}}} sacos
    - Sales trend percentage: {{{salesTrendPercentage}}}%
    - Is sales trend comparison possible: {{{isTrendComparisonPossible}}}

    Based *only* on this data, provide the following information in Spanish:

    1.  **summary**: A 1-2 sentence overview of the week. Mention total raw material received, total units produced, and the average transformation index.
        Example: "Esta semana se recibieron XXXX.XX L de materia prima y se produjeron YYYY unidades, con un índice de transformación promedio de Z.ZZ%."

    2.  **topProviderSummary**: A sentence stating the top provider's name and their total quantity in liters.
        Format: "{{{topProviderName}}} fue el proveedor más destacado con {{{topProviderTotal}}} L."

    3.  **topClientSummary**: A sentence stating the top client's name and their total sales amount in S/.
        Format: "{{{topClientName}}} fue el cliente principal con S/. {{{topClientTotal}}} en ventas."
    
    4.  **stockStatusSummary**: A sentence stating the final number of 'sacos' remaining, formatted to two decimal places.
        Format: "Quedan {{{stockInSacos}}} sacos restantes."

    5.  **salesTrendSummary**: Check 'isTrendComparisonPossible'.
        - If true, create a sentence describing the trend using 'salesTrendPercentage'. Format as "Las ventas (aumentaron/disminuyeron) un X.XX%...".
        - If false, state that no comparison is possible. Format as "No hay datos de ventas de semanas anteriores para comparar."
  `,
});

const generateWeeklyReportFlow = ai.defineFlow(
  {
    name: 'generateWeeklyReportFlow',
    inputSchema: WeeklyReportInputSchema,
    outputSchema: WeeklyReportOutputSchema,
  },
  async (input) => {
    // Round numbers for cleaner output in the prompt
    const roundedInput = {
      ...input,
      totalRawMaterial: parseFloat(input.totalRawMaterial.toFixed(2)),
      totalUnitsProduced: Math.round(input.totalUnitsProduced),
      avgTransformationIndex: parseFloat(input.avgTransformationIndex.toFixed(2)),
      topProviderTotal: parseFloat(input.topProviderTotal.toFixed(2)),
      topClientTotal: parseFloat(input.topClientTotal.toFixed(2)),
      stockInSacos: parseFloat(input.stockInSacos.toFixed(2)),
      salesTrendPercentage: parseFloat(input.salesTrendPercentage.toFixed(2)),
    };

    const { output } = await prompt(roundedInput);
    if (!output) {
        throw new Error("The AI model did not return a valid report.");
    }
    return output;
  }
);
