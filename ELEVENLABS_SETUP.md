# ElevenLabs Integration Setup Guide

This guide will help you set up ElevenLabs Conversational AI as an alternative voice service in your application.

## Prerequisites

1. An [ElevenLabs account](https://elevenlabs.io/)
2. Active ElevenLabs API subscription
3. Your backend server running and accessible

## Step 1: Get Your API Key

1. Go to [ElevenLabs Profile Settings](https://elevenlabs.io/app/settings/api-keys)
2. Copy your API key
3. Add it to your `server/.env` file:
   ```env
   ELEVENLABS_API_KEY=your_api_key_here
   ```

## Step 2: Create a Conversational AI Agent

### Option A: Using the ElevenLabs Dashboard (Recommended for first time)

1. Navigate to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Click "Create Agent"
3. Choose a name: `City of Goodness Business Finder`

### Configure Agent Settings:

**First Message:**

```
Hello! I'm your City of Goodness assistant. I can help you find businesses and services in Sacramento County. What are you looking for?
```

**System Prompt:**

```
You are a specialized voice assistant for the 'City of Goodness' project, designed EXCLUSIVELY to help users find businesses and services in Sacramento County, California.

Your PRIMARY FUNCTION: Search and provide information about local businesses, restaurants, services, and commercial establishments when users request them.

IMPORTANT LANGUAGE RULE: Always respond in the SAME LANGUAGE the user speaks to you. Most commonly this will be Russian, Ukrainian, or American English, but it can be any other language. Mirror the user's language exactly.

REQUEST VALIDATION: Before responding, analyze if the user's request is related to finding/searching for a business, place, restaurant, or service.
- IF YES (search-related): Use the search_nearby_business tool to help them.
- IF NO (general conversation): Politely decline and redirect to business search.

Remember: Stay conversational, friendly, and helpful, but keep focused on your core mission - helping people discover local businesses.
```

**Voice Selection:**

- Choose from available voices (e.g., Rachel, Bella, Antoni)
- Preview different voices to find the best fit

4. Click "Create Agent"
5. Copy the **Agent ID** from the agent details page
6. Add it to your `server/.env`:
   ```env
   ELEVENLABS_AGENT_ID=your_agent_id_here
   ```

## Step 3: Add Custom Tool (Webhook) for Business Search

This is crucial for the business search functionality:

### Using ElevenLabs Dashboard:

1. Open your agent in the dashboard
2. Go to "Tools" section
3. Click "Add Tool" → "Webhook"
4. Configure the webhook:

**Tool Name:** `search_nearby_business`

**Description:**

```
Search for businesses near the user location in Sacramento County, California. Use this ONLY when user explicitly asks to find, search for, or locate businesses, restaurants, shops, services, or any commercial establishments.
```

**Webhook URL:**

- For production: `https://your-domain.com/api/search`
- For local development: Use [ngrok](https://ngrok.com/) to expose your local server:
  ```bash
  ngrok http 3001
  ```
  Then use the ngrok URL: `https://your-ngrok-id.ngrok.io/api/search`

**Method:** `POST`

**Parameters:**

- `query` (string, required): "What the user is searching for"
- `latitude` (number, optional): "User latitude coordinate"
- `longitude` (number, optional): "User longitude coordinate"

**Authentication:** None (you can add API key authentication if needed)

5. Save the tool configuration

### Option B: Using the API (Advanced)

You can also configure the agent programmatically using the helper functions in `server/src/services/elevenlabs.service.js`:

```javascript
import {
  configureAgent,
  addSearchTool,
} from "./services/elevenlabs.service.js";

// Configure agent
await configureAgent("https://your-domain.com/api/search");

// Add search tool
await addSearchTool("https://your-domain.com/api/search");
```

## Step 4: Test the Integration

1. Start your backend server:

   ```bash
   cd server
   npm run dev
   ```

2. Start your frontend:

   ```bash
   cd client
   npm run dev
   ```

3. Open the app in your browser
4. Click the "ElevenLabs" toggle button
5. Wait for the connection to establish
6. Click the microphone button and try a query like:
   - "Find me a coffee shop nearby"
   - "Найди парикмахерскую" (Russian)
   - "Where can I get pizza?"

## Troubleshooting

### Connection Errors

**Problem:** WebSocket connection fails

**Solutions:**

- Verify your API key is correct
- Check that the agent ID is properly set
- Ensure your ElevenLabs subscription is active

### No Search Results

**Problem:** Agent responds but doesn't call the search tool

**Solutions:**

- Verify the webhook URL is accessible (test with curl or Postman)
- Check the tool configuration in ElevenLabs dashboard
- Review server logs for incoming webhook requests
- Make sure you're asking for business search (not general questions)

### Audio Issues

**Problem:** Can hear the agent but it can't hear you

**Solutions:**

- Check browser microphone permissions
- Ensure your microphone is working in other applications
- Try refreshing the page and reconnecting

### Webhook Not Being Called

**Problem:** Agent responds but search results don't appear

**Solutions:**

- Check that your server is publicly accessible (use ngrok for local dev)
- Verify the webhook URL in ElevenLabs dashboard
- Check server console for POST requests to `/api/search`
- Review the webhook configuration parameters

## Switching Between Services

You can seamlessly switch between OpenAI and ElevenLabs:

1. Click the service toggle at the top of the page
2. The app will disconnect from the current service
3. It will automatically connect to the new service
4. Both services share the same business search backend

## Voice Quality Comparison

**OpenAI Realtime API:**

- Pros: Very low latency, natural conversation flow
- Cons: Limited voice options

**ElevenLabs:**

- Pros: High-quality voice synthesis, many voice options, emotional expression
- Cons: Slightly higher latency compared to OpenAI WebRTC

Choose the service that best fits your needs!

## Advanced Configuration

### Custom Voice Selection

To use a different ElevenLabs voice:

1. Go to [Voice Library](https://elevenlabs.io/app/voice-library)
2. Choose or clone a voice
3. Copy the Voice ID
4. Update the agent configuration in `server/src/services/elevenlabs.service.js`:
   ```javascript
   tts: {
     voice_id: "your_voice_id_here",
   }
   ```

### Webhook Authentication

For production, add authentication to your search endpoint:

1. Generate an API key for webhook calls
2. Add it to your `.env`:
   ```env
   WEBHOOK_API_KEY=your_secure_key
   ```
3. Update the webhook configuration in ElevenLabs to include the API key header
4. Add validation in `server/src/routes/index.js`

## Support

- [ElevenLabs Documentation](https://elevenlabs.io/docs)
- [ElevenLabs Conversational AI Docs](https://elevenlabs.io/docs/conversational-ai)
- [ElevenLabs Discord Community](https://discord.gg/elevenlabs)

---

Built with ❤️ for City of Goodness
