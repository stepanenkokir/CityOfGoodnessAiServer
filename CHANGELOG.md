# Changelog

## [2025-01-20] - ElevenLabs Integration

### Added

#### Backend

- **New Service**: `server/src/services/elevenlabs.service.js`

  - `getSignedUrl()` - Get WebSocket connection URL
  - `configureAgent()` - Configure ElevenLabs agent
  - `addSearchTool()` - Add webhook tool for business search

- **New Route**: `POST /api/elevenlabs/session`

  - Returns signed WebSocket URL for ElevenLabs connection

- **Environment Variables**:
  - `ELEVENLABS_API_KEY` - ElevenLabs API authentication
  - `ELEVENLABS_AGENT_ID` - Agent identifier for Conversational AI

#### Frontend

- **New Service**: `client/src/services/realtime-elevenlabs.service.js`

  - Complete ElevenLabs WebSocket client implementation
  - Audio streaming and playback
  - Microphone capture and transmission
  - Tool call handling for business search
  - Same callback interface as OpenAI client

- **UI Enhancement**: Service Toggle Switch

  - Switch between OpenAI and ElevenLabs
  - Modern, animated toggle buttons
  - Automatic reconnection on service change
  - Service-aware connection status messages

- **Styling**: `client/src/App.css`
  - Service toggle container with gradient background
  - Active/inactive button states with smooth transitions
  - Ripple effect on button press
  - Responsive design for mobile devices

#### Documentation

- **ELEVENLABS_SETUP.md** - Complete setup guide for ElevenLabs integration
- **README.md** - Updated with dual voice service information

### Modified

#### Backend

- `server/env.example` - Added ElevenLabs environment variables
- `server/src/routes/index.js` - Added ElevenLabs session endpoint

#### Frontend

- `client/src/App.jsx` - Added service selection and conditional client initialization
- `client/src/App.css` - Added toggle switch styling

### Technical Details

#### Architecture

- **Minimal Changes**: Both services share the same backend search logic
- **Same Interface**: Both clients implement identical callback APIs
- **Seamless Switching**: Frontend can switch services without page reload
- **Consistent Search**: Both use OpenAI embeddings for vector search

#### Key Features

- OpenAI: Ultra-low latency WebRTC with built-in function calling
- ElevenLabs: High-quality voice synthesis with webhook tools
- Both services support multilingual conversations
- Both maintain the same business search functionality

### Migration Notes

For existing users:

1. Add ElevenLabs API key to `.env` (optional)
2. Create ElevenLabs agent (see ELEVENLABS_SETUP.md)
3. Configure webhook tool pointing to your `/api/search` endpoint
4. Add agent ID to `.env`
5. Restart server and enjoy dual voice services!

OpenAI remains the default service, so existing installations continue to work without changes.

---

For detailed setup instructions, see [ELEVENLABS_SETUP.md](./ELEVENLABS_SETUP.md)
