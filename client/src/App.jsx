import { useState, useEffect, useRef } from "react";
import { MicrophoneButton } from "./components/MicrophoneButton";
import { ResultsList } from "./components/ResultsList";
import { useGeolocation } from "./hooks/useGeolocation";
import { RealtimeWebRTCClient } from "./services/realtime-webrtc.service";
import "./App.css";

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicrophoneActive, setIsMicrophoneActive] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [assistantTranscript, setAssistantTranscript] = useState("");
  const [error, setError] = useState(null);
  const [isAIResponding, setIsAIResponding] = useState(false);

  const realtimeClientRef = useRef(null);
  const { latitude, longitude, error: locationError } = useGeolocation();

  // Initialize Realtime WebRTC client
  useEffect(() => {
    const client = new RealtimeWebRTCClient();
    realtimeClientRef.current = client;

    // Setup callbacks
    client.onConnected(() => {
      console.log("Connected to OpenAI via WebRTC");
      setIsConnected(true);
      setError(null);
    });

    client.onDisconnected(() => {
      console.log("Disconnected from OpenAI");
      setIsConnected(false);
    });

    client.onError((errorMsg) => {
      console.error("Realtime error:", errorMsg);
      setError(errorMsg);
      setIsConnected(false);
    });

    client.onTranscript((text) => {
      console.log("User transcript:", text);
      setTranscript(text);
    });

    client.onAssistantTranscript((text) => {
      console.log("Assistant transcript:", text);
      setAssistantTranscript(text);
    });

    client.onSearchResults((results) => {
      console.log("Search results received:", results);
      setSearchResults(results);
    });

    client.onAudioReceived(() => {
      setIsAIResponding(true);
      setTimeout(() => setIsAIResponding(false), 300);
    });

    client.onMicrophoneState((isActive) => {
      setIsMicrophoneActive(isActive);
    });

    // Connect to OpenAI (but don't start microphone yet)
    client.connect().catch((err) => {
      console.error("Failed to connect:", err);
      setError("Failed to connect to OpenAI");
    });

    return () => {
      client.disconnect();
    };
  }, []);

  // Update location when available
  useEffect(() => {
    if (realtimeClientRef.current && latitude && longitude) {
      realtimeClientRef.current.setUserLocation(latitude, longitude);
    }
  }, [latitude, longitude]);

  // Display errors
  const displayError = error || locationError;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🎙️ City of Goodness Voice Assistant</h1>
        <p className="app-subtitle">
          Find businesses near you in Sacramento County, CA
        </p>
      </header>

      <main className="app-main">
        {displayError && (
          <div className="error-banner">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {displayError}
          </div>
        )}

        {!latitude && !locationError && (
          <div className="info-banner">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            Requesting location access...
          </div>
        )}

        <div className="interaction-area">
          <MicrophoneButton
            isRecording={isMicrophoneActive}
            isConnected={isConnected}
            onClick={() => {
              if (realtimeClientRef.current) {
                realtimeClientRef.current.toggleMicrophone();
              }
            }}
          />

          {!isConnected && (
            <div className="connection-status">
              <div className="spinner"></div>
              <p>Connecting to OpenAI...</p>
            </div>
          )}

          {transcript && (
            <div className="transcript-box">
              <p className="transcript-label">You said:</p>
              <p className="transcript-text">"{transcript}"</p>
            </div>
          )}

          {assistantTranscript && (
            <div className="transcript-box assistant">
              <p className="transcript-label">Assistant response:</p>
              <p className="transcript-text">"{assistantTranscript}"</p>
            </div>
          )}

          {isAIResponding && (
            <div className="ai-indicator">
              <div className="spinner"></div>
              <p>AI is responding...</p>
            </div>
          )}
        </div>

        <ResultsList results={searchResults} />
      </main>

      <footer className="app-footer">
        <p>
          Powered by OpenAI Realtime API (WebRTC) and City of Goodness &copy;
          2025
        </p>
      </footer>
    </div>
  );
}

export default App;
