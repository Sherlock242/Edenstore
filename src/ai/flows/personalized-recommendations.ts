// src/ai/flows/personalized-recommendations.ts
'use server';

/**
 * @fileOverview Flow for generating personalized t-shirt recommendations based on user history.
 *
 * - generatePersonalizedRecommendations - A function that generates personalized t-shirt recommendations.
 * - PersonalizedRecommendationsInput - The input type for the generatePersonalizedRecommendations function.
 * - PersonalizedRecommendationsOutput - The return type for the generatePersonalizedRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedRecommendationsInputSchema = z.object({
  userId: z.string().describe('The ID of the user to generate recommendations for.'),
  browsingHistory: z.array(z.string()).describe('The user browsing history.'),
  purchaseHistory: z.array(z.string()).describe('The user purchase history.'),
});

export type PersonalizedRecommendationsInput = z.infer<typeof PersonalizedRecommendationsInputSchema>;

const PersonalizedRecommendationsOutputSchema = z.object({
  recommendations: z.array(z.string()).describe('A list of recommended t-shirts.'),
});

export type PersonalizedRecommendationsOutput = z.infer<typeof PersonalizedRecommendationsOutputSchema>;

export async function generatePersonalizedRecommendations(
  input: PersonalizedRecommendationsInput
): Promise<PersonalizedRecommendationsOutput> {
  return personalizedRecommendationsFlow(input);
}

const personalizedRecommendationsPrompt = ai.definePrompt({
  name: 'personalizedRecommendationsPrompt',
  input: {schema: PersonalizedRecommendationsInputSchema},
  output: {schema: PersonalizedRecommendationsOutputSchema},
  prompt: `You are an expert in recommending anime t-shirts to users based on their past behavior.

  Based on the user's browsing history:
  {{#each browsingHistory}}
  - {{{this}}}
  {{/each}}

  And purchase history:
  {{#each purchaseHistory}}
  - {{{this}}}
  {{/each}}

  Recommend a list of anime t-shirts that the user might be interested in. Only include t-shirt names in the list.
  `,
});

const personalizedRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedRecommendationsFlow',
    inputSchema: PersonalizedRecommendationsInputSchema,
    outputSchema: PersonalizedRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await personalizedRecommendationsPrompt(input);
    return output!;
  }
);
