
"use server";
import { generatePersonalizedRecommendations } from "@/ai/flows/personalized-recommendations";
import { products } from "@/lib/placeholder-data";
import type { Product } from "@/lib/placeholder-data";

// Mock user data for demonstration purposes
const MOCK_USER_DATA = {
  userId: "user-123",
  browsingHistory: ["Titan Slayer Hoodie", "Z Warrior's Spirit Tee"],
  purchaseHistory: ["Pirate King's Crew Shirt"],
};

export async function getAiRecommendations(): Promise<Product[]> {
  try {
    const { recommendations } = await generatePersonalizedRecommendations(
      MOCK_USER_DATA
    );

    // The AI returns a list of names. We need to find the corresponding product objects.
    const recommendedProducts = recommendations
      .map((name) => {
        // Find product with a case-insensitive match
        const found = products.find(p => p.name.toLowerCase() === name.toLowerCase());
        // Sometimes the model adds "tee" or "shirt" at the end, let's try to match without it
        if (!found) {
          const simplifiedName = name.replace(/ (tee|shirt|hoodie)$/i, '').toLowerCase();
          return products.find(p => p.name.toLowerCase().includes(simplifiedName));
        }
        return found;
      })
      .filter((p): p is Product => p !== undefined);

    // Remove duplicates
    const uniqueRecommendations = Array.from(new Set(recommendedProducts.map(p => p.id)))
        .map(id => recommendedProducts.find(p => p.id === id) as Product);


    return uniqueRecommendations;
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    // Return a random set of products as a fallback
    return products.sort(() => 0.5 - Math.random()).slice(0, 4);
  }
}
