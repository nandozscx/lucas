'use server';
/**
 * @fileOverview An AI flow for registering deliveries via natural language.
 *
 * - registerDeliveriesFromText - A function that parses text to create delivery records.
 * - RegisterDeliveriesInput - The input type for the registerDeliveriesFromText function.
 * - RegisterDeliveriesOutput - The return type for the registerDeliveriesFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {format} from 'date-fns';

const DeliveryEntrySchema = z.object({
  providerName: z.string().describe('The name of the provider.'),
  quantity: z.number().describe('The quantity of the delivery in liters.'),
});

const RegisterDeliveriesInputSchema = z.object({
  query: z.string().describe('The user\'s spoken command.'),
  providerNames: z.array(z.string()).describe('A list of valid provider names to help with matching.'),
});
export type RegisterDeliveriesInput = z.infer<typeof RegisterDeliveriesInputSchema>;

const RegisterDeliveriesOutputSchema = z.object({
  date: z.string().describe("The date for the deliveries in YYYY-MM-DD format. Default to today if not specified."),
  entries: z.array(DeliveryEntrySchema).describe('A list of parsed delivery entries.'),
});
export type RegisterDeliveriesOutput = z.infer<typeof RegisterDeliveriesOutputSchema>;

export async function registerDeliveriesFromText(input: RegisterDeliveriesInput): Promise<RegisterDeliveriesOutput> {
  return registerDeliveriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'registerDeliveriesPrompt',
  input: {schema: RegisterDeliveriesInputSchema},
  output: {schema: RegisterDeliveriesOutputSchema},
  prompt: `You are an intelligent assistant for a supply management app. Your task is to parse a user's spoken command to extract delivery information.

The user's command is: "{{query}}"

Here is a list of valid provider names:
{{#each providerNames}}
- {{{this}}}
{{/each}}

You must match the names in the user's command to the closest valid provider name from the list. The matching should be case-insensitive and handle minor variations or nicknames. For example, if the user says "don lucio" and the valid name is "Don Lucio", you should match it.

If a date is mentioned (like "ayer", "hoy", "mañana"), use that date. If no date is mentioned, assume the deliveries are for today, which is ${format(new Date(), 'yyyy-MM-dd')}.

Extract all provider-quantity pairs from the command and return them as a structured list of entries.

The output must be in the specified JSON format.
`,
});

const registerDeliveriesFlow = ai.defineFlow(
  {
    name: 'registerDeliveriesFlow',
    inputSchema: RegisterDeliveriesInputSchema,
    outputSchema: RegisterDeliveriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("Failed to parse delivery information from text.");
    }
    return output;
  }
);
