# 🎙️ Voice Business Finder MVP

A voice-activated business search assistant that uses OpenAI's Realtime API (WebRTC) to help users find businesses near them in Sacramento County, CA. The app combines voice interaction, vector search in Supabase, and fallback to Google Places API.

## ✨ Features

- 🎤 **Voice Interface** - Just speak naturally, no buttons needed
- 🌍 **Multilingual** - Responds in Russian, Ukrainian, English, and more
- 🎯 **Smart Search** - Vector similarity search with Google Places fallback
- 📍 **Location Aware** - Finds businesses near you in Sacramento County
- ⚡ **Ultra-Fast** - WebRTC P2P connection for minimal latency
- 🎨 **Modern UI** - Beautiful, responsive design with smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (with Realtime API access)
- Supabase project with vector search setup
- Google Places API key

### 1. Install Dependencies

```powershell
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Setup

**Backend** - Create `server/.env`:

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
GOOGLE_PLACES_API_KEY=your-google-api-key
PORT=3001
```

**Frontend** - Create `client/.env`:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Database Setup

Run the `supabase-setup.sql` script in your Supabase SQL Editor to create the required tables and functions.

### 4. Run the Application

**Terminal 1 - Backend:**

```powershell
cd server
npm run dev
```

**Terminal 2 - Frontend:**

```powershell
cd client
npm run dev
```

Open your browser to `http://localhost:5173`

## 🎯 How It Works

### User Flow

1. **Open the app** → Browser requests microphone and location permissions
2. **WebRTC Connection** → Direct P2P audio connection with OpenAI
3. **Just speak!** → Server VAD automatically detects when you're done talking
4. **AI responds** → Voice response + search results displayed

### AI Assistant

The voice assistant is **specialized exclusively for business search** in Sacramento County:

**✅ What it does:**

- Finds businesses, restaurants, shops, and services
- Responds in your language (Russian, Ukrainian, English, etc.)
- Provides detailed voice responses

**❌ What it won't do:**

- Answer general questions about weather, jokes, or unrelated topics
- Engages in casual conversation outside of business search

**Example:**

- You: _"What's the weather?"_
- Assistant: _"I specialize in finding businesses in Sacramento County. Need help finding something nearby?"_

### Search Process

1. **Vector Search** - Semantic matching using Supabase
2. **Google Places Fallback** - If fewer than 3 results found
3. **Geographic Filtering** - All results limited to Sacramento County, CA

## 🔧 Troubleshooting

### Common Issues

**Microphone not working:**

- Use Chrome or Edge browser
- Check browser permissions (click the microphone icon in address bar)
- Ensure you're on HTTPS or localhost

**No audio from AI:**

- Check browser audio settings
- Try clicking somewhere on the page first
- Ensure speakers/headphones are connected

**No search results:**

- Verify your Supabase database has business data
- Check that Google Places API key is valid
- Review server console for errors

**Connection issues:**

- Make sure backend server is running on port 3001
- Check that all API keys are correct
- Review browser console for error messages

## 📚 Documentation

- **[TECHNICAL.md](./TECHNICAL.md)** - Detailed technical documentation for developers
- **[supabase-setup.sql](./supabase-setup.sql)** - Database setup script

## 🎯 Example Queries

Try these sample queries:

- "Find me a coffee shop near me"
- "Where can I get a haircut?"
- "Show me restaurants with Russian food"
- "Найди парикмахерскую" (Russian)
- "Де можна знайти магазин?" (Ukrainian)

## 📄 License

ISC

---

Built with ❤️ using OpenAI Realtime API, React, and Node.js
