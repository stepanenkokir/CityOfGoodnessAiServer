import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Search for businesses using embedding vector similarity
 * @param {number[]} embeddingVector - The embedding vector to search with
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} Array of business IDs with similarity scores
 */
export async function searchBusinessByEmbedding(embeddingVector, limit = 5) {
  try {
    // Use RPC function for vector similarity search
    // The query uses cosine similarity (1 - cosine_distance)
    console.log("Searching for businesses with embedding:");
    const { data, error } = await supabase.rpc("match_business_embeddings", {
      query_embedding: embeddingVector,
      match_threshold: 0.4,
      match_count: limit,
    });

    if (error) {
      console.error("Supabase search error:", error);
      throw error;
    }
    console.log("RESULT = ", data);
    return data || [];
  } catch (error) {
    console.error("Error in searchBusinessByEmbedding:", error);
    return [];
  }
}

/**
 * Get business details by IDs
 * @param {Array<string>} businessIds - Array of business UUIDs
 * @returns {Promise<Array>} Array of business objects
 */
export async function getBusinessDetails(businessIds) {
  if (!businessIds || businessIds.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, name, description, address, city, latitude, longitude, phone, website"
      )
      .in("id", businessIds);

    if (error) {
      console.error("Error fetching business details:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getBusinessDetails:", error);
    return [];
  }
}

/**
 * Combined search: get embeddings matches and their business details
 * @param {number[]} embeddingVector - The embedding vector to search with
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of business objects with details
 */
export async function searchBusinesses(embeddingVector, limit = 5) {
  const matches = await searchBusinessByEmbedding(embeddingVector, limit);

  if (matches.length === 0) {
    return [];
  }

  const businessIds = matches.map((match) => match.business_id);
  const businesses = await getBusinessDetails(businessIds);

  // Merge similarity scores with business details
  return businesses.map((business) => {
    const match = matches.find((m) => m.business_id === business.id);
    return {
      ...business,
      similarity: match?.similarity || 0,
    };
  });
}
