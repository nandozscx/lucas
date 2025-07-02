'use server';
/**
 * @fileOverview An AI flow for creating a new provider via natural language.
 *
 * - createProviderFromText - A function that parses text to create a provider record.
 * - CreateProviderInput - The input type for the createProviderFromText function.
 * - CreateProviderOutput - The return type for the createProviderFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CreateProviderInputSchema = z.object({
  query: z.string().describe("The user's spoken command to create a new provider."),
});
export type CreateProviderInput = z.infer<typeof CreateProviderInputSchema>;

const CreateProviderOutputSchema = z.object({
  name: z.string().describe('The name of the new provider.'),
  price: z.number().describe('The price associated with the provider.'),
  address: z.string().describe('The address of the provider.'),
  phone: z.string().describe('The phone number of the provider.'),
});
export type CreateProviderOutput = z.infer<typeof CreateProviderOutputSchema>;

export async function createProviderFromText(input: CreateProviderInput): Promise<CreateProviderOutput> {
  return createProviderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createProviderPrompt',
  input: {schema: CreateProviderInputSchema},
  output: {schema: CreateProviderOutputSchema},
  prompt: `You are an intelligent assistant for a supply management app. Your task is to parse a user's spoken command to extract information for creating a new provider.

The user's command is: "{{query}}"

You must extract the provider's name, their price, their address, and their phone number.

The output must be in the specified JSON format.
`,
});

const createProviderFlow = ai.defineFlow(
  {
    name: 'createProviderFlow',
    inputSchema: CreateProviderInputSchema,
    outputSchema: CreateProviderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Failed to parse provider information from text.");
    }
    return output;
  }
);
