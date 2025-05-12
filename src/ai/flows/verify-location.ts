'use server';

/**
 * @fileOverview Verifies the user's location against the designated lecture location using AI.
 *
 * - verifyLocation - A function that verifies the user's location.
 * - VerifyLocationInput - The input type for the verifyLocation function.
 * - VerifyLocationOutput - The return type for the verifyLocation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyLocationInputSchema = z.object({
  userLatitude: z
    .number()
    .describe('The latitude of the user.'),
  userLongitude: z
    .number()
    .describe('The longitude of the user.'),
  lectureLatitude: z
    .number()
    .describe('The latitude of the lecture location.'),
  lectureLongitude: z
    .number()
    .describe('The longitude of the lecture location.'),
  distanceThreshold: z
    .number()
    .describe('The acceptable distance threshold in meters.'),
});
export type VerifyLocationInput = z.infer<typeof VerifyLocationInputSchema>;

const VerifyLocationOutputSchema = z.object({
  isLocationValid: z
    .boolean()
    .describe('Whether the user is within the designated lecture location.'),
  distance: z
    .number()
    .describe('The distance between the user and the lecture location in meters.'),
  message: z
    .string()
    .describe('A message indicating whether the location is valid or not.'),
});
export type VerifyLocationOutput = z.infer<typeof VerifyLocationOutputSchema>;

export async function verifyLocation(input: VerifyLocationInput): Promise<VerifyLocationOutput> {
  return verifyLocationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyLocationPrompt',
  input: {schema: VerifyLocationInputSchema},
  output: {schema: VerifyLocationOutputSchema},
  prompt: `You are a location verification expert. You will verify if a user is within a lecture location based on their coordinates and a distance threshold.

  User Latitude: {{{userLatitude}}}
  User Longitude: {{{userLongitude}}}
  Lecture Latitude: {{{lectureLatitude}}}
  Lecture Longitude: {{{lectureLongitude}}}
  Distance Threshold: {{{distanceThreshold}}} meters

  You must calculate the distance between the user and the lecture location using the Haversine formula. This is the formula:

  // Function to calculate Haversine distance between two coordinates
  function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2-lat1) * Math.PI / 180;
    const Δλ = (lon2-lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // Distance in meters
    return d;
  }

  If the calculated distance is within the distance threshold, then the user is within the lecture location. Otherwise, the user is not within the lecture location.

  Return isLocationValid as true if the user is within the lecture location, and false otherwise.
  Also, return the calculated distance between the user and the lecture location in the distance field.
  Also, create a message that indicates whether the location is valid or not. If the location is valid, the message should say 'Location is valid'. If the location is not valid, the message should say 'Location is not valid'.
`,
  
});

const verifyLocationFlow = ai.defineFlow(
  {
    name: 'verifyLocationFlow',
    inputSchema: VerifyLocationInputSchema,
    outputSchema: VerifyLocationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
