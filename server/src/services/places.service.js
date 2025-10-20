import { Client } from "@googlemaps/google-maps-services-js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({});
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Sacramento County, CA bounds (approximately)
const SACRAMENTO_BOUNDS = {
  north: 38.7719,
  south: 38.3616,
  east: -120.7583,
  west: -121.5583,
};

/**
 * Search for places using Google Places API
 * Restricted to Sacramento County, CA
 * @param {string} query - Search query
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @returns {Promise<Array>} Array of formatted business results
 */
export async function searchPlaces(query, userLat, userLng) {
  try {
    // Ensure user location is within Sacramento County bounds
    const isInBounds =
      userLat <= SACRAMENTO_BOUNDS.north &&
      userLat >= SACRAMENTO_BOUNDS.south &&
      userLng <= SACRAMENTO_BOUNDS.east &&
      userLng >= SACRAMENTO_BOUNDS.west;

    const searchLocation = isInBounds
      ? { lat: userLat, lng: userLng }
      : { lat: 38.5816, lng: -121.4944 }; // Default to Sacramento city center

    const response = await client.textSearch({
      params: {
        query: query,
        location: searchLocation,
        radius: 15000, // 15km radius
        key: GOOGLE_PLACES_API_KEY,
      },
    });

    if (
      response.data.status !== "OK" &&
      response.data.status !== "ZERO_RESULTS"
    ) {
      console.error("Google Places API error:", response.data.status);
      return [];
    }

    // Filter results to only include those within Sacramento County
    const results = response.data.results || [];
    const filteredResults = results.filter((place) => {
      const lat = place.geometry.location.lat;
      const lng = place.geometry.location.lng;
      return (
        lat <= SACRAMENTO_BOUNDS.north &&
        lat >= SACRAMENTO_BOUNDS.south &&
        lng <= SACRAMENTO_BOUNDS.east &&
        lng >= SACRAMENTO_BOUNDS.west
      );
    });

    // Format results to match Supabase schema
    return filteredResults.slice(0, 5).map((place) => ({
      id: place.place_id,
      name: place.name,
      description: place.types?.join(", ") || "",
      address: place.formatted_address || "",
      city: extractCity(place.formatted_address),
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      source: "google_places",
    }));
  } catch (error) {
    console.error("Error in searchPlaces:", error);
    return [];
  }
}

/**
 * Extract city name from formatted address
 * @param {string} address - Formatted address
 * @returns {string} City name
 */
function extractCity(address) {
  if (!address) return "Sacramento";

  // Try to extract city from address (format: "Street, City, State ZIP")
  const parts = address.split(",");
  if (parts.length >= 2) {
    return parts[parts.length - 2]
      .trim()
      .replace(/\d{5}.*/, "")
      .trim();
  }

  return "Sacramento";
}
