import dotenv from "dotenv";

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io";

/**
 * Get signed URL for ElevenLabs Conversational AI WebSocket connection
 * @returns {Promise<string>} Signed WebSocket URL
 */
export async function getSignedUrl() {
  if (!ELEVENLABS_AGENT_ID) {
    throw new Error("ELEVENLABS_AGENT_ID is not configured");
  }

  const response = await fetch(
    `${ELEVENLABS_API_URL}/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
    {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get signed URL: ${error}`);
  }

  const data = await response.json();
  return data.signed_url;
}

/**
 * Update or create ElevenLabs agent with custom webhook tool for business search
 * This function is used for initial setup or agent configuration updates
 * @param {string} webhookUrl - The public URL of your /api/search endpoint
 * @returns {Promise<object>} Agent configuration
 */
export async function configureAgent(webhookUrl) {
  const agentConfig = {
    conversation_config: {
      agent: {
        prompt: {
          prompt:
            "You are a specialized voice assistant for the 'City of Goodness' project, designed EXCLUSIVELY to help users find businesses and services in Sacramento County, California.\n\n" +
            "Your PRIMARY FUNCTION: Search and provide information about local businesses, restaurants, services, and commercial establishments when users request them.\n\n" +
            "IMPORTANT LANGUAGE RULE: Always respond in the SAME LANGUAGE the user speaks to you. Most commonly this will be Russian, Ukrainian, or American English, but it can be any other language. Mirror the user's language exactly.\n\n" +
            "REQUEST VALIDATION: Before responding, analyze if the user's request is related to finding/searching for a business, place, restaurant, or service.\n" +
            "- IF YES (search-related): Use the search_nearby_business tool to help them. When you receive search results, read the voice_response field from the results.\n" +
            "- IF NO (general conversation, jokes, weather, philosophy, etc.): Politely decline in a friendly way. For example: 'I specialize in finding businesses in Sacramento County. Can I help you find something nearby?'\n\n" +
            "Remember: Stay conversational, friendly, and helpful, but keep focused on your core mission - helping people discover local businesses.",
        },
        first_message:
          "Hello! I'm your City of Goodness assistant. I can help you find businesses and services in Sacramento County. What are you looking for?",
        language: "en",
      },
      tts: {
        voice_id: "21m00Tcm4TlvDq8ikWAM", // Default ElevenLabs voice (Rachel)
      },
    },
  };

  // If agent ID exists, update it
  if (ELEVENLABS_AGENT_ID) {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/v1/convai/agents/${ELEVENLABS_AGENT_ID}`,
      {
        method: "PATCH",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agentConfig),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update agent: ${error}`);
    }

    return await response.json();
  }

  // Otherwise create new agent
  const response = await fetch(`${ELEVENLABS_API_URL}/v1/convai/agents`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "City of Goodness Business Finder",
      ...agentConfig,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create agent: ${error}`);
  }

  const data = await response.json();
  console.log("Created new ElevenLabs agent with ID:", data.agent_id);
  console.log(
    "Add this to your .env file: ELEVENLABS_AGENT_ID=" + data.agent_id
  );

  return data;
}

/**
 * Add custom tool (webhook) to ElevenLabs agent for business search
 * @param {string} webhookUrl - The public URL of your /api/search endpoint
 * @returns {Promise<object>} Tool configuration
 */
export async function addSearchTool(webhookUrl) {
  const toolConfig = {
    type: "webhook",
    name: "search_nearby_business",
    description:
      "Search for businesses near the user location in Sacramento County, California. Use this ONLY when user explicitly asks to find, search for, or locate businesses, restaurants, shops, services, or any commercial establishments.",
    url: webhookUrl,
    method: "POST",
    parameters: {
      query: {
        type: "string",
        description:
          'What the user is searching for (e.g., "парикмахерская", "русская кухня", "coffee shop")',
        required: true,
      },
      latitude: {
        type: "number",
        description: "User latitude coordinate",
        required: false,
      },
      longitude: {
        type: "number",
        description: "User longitude coordinate",
        required: false,
      },
    },
  };

  const response = await fetch(
    `${ELEVENLABS_API_URL}/v1/convai/agents/${ELEVENLABS_AGENT_ID}/tools`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toolConfig),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add tool: ${error}`);
  }

  return await response.json();
}
