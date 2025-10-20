import express from "express";
import { generateEphemeralToken } from "../services/openai.service.js";
import { getSignedUrl } from "../services/elevenlabs.service.js";
import { handleSearchRequest } from "../controllers/search.controller.js";

const router = express.Router();

/**
 * POST /api/session
 * Generate ephemeral token for OpenAI Realtime API (WebRTC)
 */
router.post("/session", async (req, res) => {
  try {
    const token = await generateEphemeralToken();
    res.json({ client_secret: { value: token } });
  } catch (error) {
    console.error("Error generating session token:", error);
    res.status(500).json({ error: "Failed to generate session token" });
  }
});

/**
 * POST /api/elevenlabs/session
 * Get signed WebSocket URL for ElevenLabs Conversational AI
 */
router.post("/elevenlabs/session", async (req, res) => {
  try {
    const signedUrl = await getSignedUrl();
    res.json({ signed_url: signedUrl });
  } catch (error) {
    console.error("Error getting ElevenLabs signed URL:", error);
    res.status(500).json({ error: "Failed to get signed URL" });
  }
});

/**
 * POST /api/search
 * Search for businesses near user location
 */
router.post("/search", async (req, res) => {
  try {
    const { query, latitude, longitude } = req.body;

    if (!query || !latitude || !longitude) {
      return res.status(400).json({
        error: "Missing required parameters: query, latitude, longitude",
      });
    }

    const results = await handleSearchRequest(query, latitude, longitude);
    res.json(results);
  } catch (error) {
    console.error("Error handling search request:", error);
    res.status(500).json({ error: "Failed to execute search" });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
