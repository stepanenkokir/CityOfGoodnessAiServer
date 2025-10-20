import { createEmbedding } from "../services/openai.service.js";
import { searchBusinesses } from "../services/supabase.service.js";
import { searchPlaces } from "../services/places.service.js";

/**
 * Handle business search request
 * First searches Supabase, then falls back to Google Places if needed
 * @param {string} query - Search query
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @returns {Promise<Object>} Search results with JSON data and voice response
 */
export async function handleSearchRequest(query, latitude, longitude) {
  try {
    console.log(`Searching for: "${query}" at ${latitude}, ${longitude}`);

    // Step 1: Generate embedding from query
    const embeddingVector = await createEmbedding(query);

    // Step 2: Search Supabase with embedding
    let results = await searchBusinesses(embeddingVector, 5);

    console.log(`Supabase found ${results.length} results`);

    // Step 3: If less than 3 results, fallback to Google Places
    if (results.length < 3) {
      console.log("Insufficient Supabase results, searching Google Places...");
      const placesResults = await searchPlaces(query, latitude, longitude);

      // Combine results, prioritizing Supabase
      console.log(`Google Places:`, placesResults);
      results = [...results, ...placesResults].slice(0, 5);
      console.log(`Total results after Google Places: ${results.length}`);
    }

    // Step 4: Format response
    const response = {
      results: results.map(formatBusinessResult),
      voiceResponse: generateVoiceResponse(results, query),
    };

    return response;
  } catch (error) {
    console.error("Error in handleSearchRequest:", error);
    return {
      results: [],
      voiceResponse: `I'm sorry, I encountered an error while searching for ${query}. Please try again.`,
    };
  }
}

/**
 * Format business result for JSON response
 * @param {Object} business - Business object
 * @returns {Object} Formatted business
 */
function formatBusinessResult(business) {
  return {
    id: business.id,
    name: business.name,
    description: business.description || "",
    address: business.address,
    city: business.city,
    latitude: business.latitude,
    longitude: business.longitude,
    phone: business.phone,
    website: business.website,
    source: business.source || "supabase",
  };
}

/**
 * Extract street address (house number and street name only)
 * Removes city, state, and ZIP code
 * @param {string} fullAddress - Full formatted address
 * @returns {string} Street address only
 */
function extractStreetAddress(fullAddress) {
  if (!fullAddress) return "";

  // Split by comma and take only the first part (street address)
  const parts = fullAddress.split(",");
  return parts[0].trim();
}

/**
 * Generate voice-friendly response text
 * @param {Array} results - Search results
 * @param {string} query - Original query
 * @returns {string} Voice response text
 */
function generateVoiceResponse(results, query) {
  if (results.length === 0) {
    return `I couldn't find any results for ${query} in Sacramento County. Could you try a different search term?`;
  }

  const count = results.length;
  const plural = count === 1 ? "" : "s";

  let response = `I found ${count} option${plural} for ${query}. `;

  // Only announce the first result
  const firstBusiness = results[0];
  response += `${firstBusiness.name}`;

  if (firstBusiness.description) {
    response += `, ${firstBusiness.description}`;
  }

  if (firstBusiness.address) {
    const streetAddress = extractStreetAddress(firstBusiness.address);
    if (streetAddress) {
      response += `, located at ${streetAddress}`;
    }
  }

  response += ".";

  return response;
}
