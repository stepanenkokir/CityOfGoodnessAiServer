import dotenv from "dotenv";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1";

/**
 * Generate an ephemeral token for OpenAI Realtime API session
 * @returns {Promise<string>} Ephemeral token
 */
export async function generateEphemeralToken() {
  const response = await fetch(`${OPENAI_API_URL}/realtime/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-10-01",
      voice: "alloy",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create session: ${error}`);
  }

  const data = await response.json();
  return data.client_secret.value;
}

/**
 * Create an embedding vector from text using OpenAI
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector
 */
export async function createEmbedding(text) {
  const response = await fetch(`${OPENAI_API_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create embedding: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Function calling schema for business search
 */
export const searchNearbyBusinessTool = {
  type: "function",
  name: "search_nearby_business",
  description:
    "Search for businesses near the user location in Sacramento County, California. Use this ONLY when user explicitly asks to find, search for, or locate businesses, restaurants, shops, services, or any commercial establishments. DO NOT use for general questions, weather, jokes, or unrelated topics.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          'What the user is searching for (e.g., "парикмахерская", "русская кухня", "coffee shop")',
      },
      latitude: {
        type: "number",
        description: "User latitude coordinate",
      },
      longitude: {
        type: "number",
        description: "User longitude coordinate",
      },
    },
    required: ["query", "latitude", "longitude"],
  },
};
