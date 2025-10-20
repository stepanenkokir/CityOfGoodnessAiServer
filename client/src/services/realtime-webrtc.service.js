import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Client for OpenAI Realtime API via WebRTC
 * Based on: https://platform.openai.com/docs/guides/realtime-webrtc
 */
export class RealtimeWebRTCClient {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.audioContext = null;
    this.audioElement = null;
    this.isConnected = false;
    this.isMicrophoneActive = false;
    this.mediaStream = null;
    this.userLocation = { latitude: null, longitude: null };
    this.assistantTranscript = "";

    // Callbacks
    this.onConnectedCallback = null;
    this.onDisconnectedCallback = null;
    this.onTranscriptCallback = null;
    this.onAssistantTranscriptCallback = null;
    this.onSearchResultsCallback = null;
    this.onAudioReceivedCallback = null;
    this.onErrorCallback = null;
    this.onMicrophoneStateCallback = null;
  }

  /**
   * Connect to OpenAI Realtime API using WebRTC
   */
  async connect() {
    try {
      console.log("Requesting ephemeral token...");

      // Get ephemeral token from our server
      const response = await axios.post(`${API_URL}/api/session`);
      const ephemeralToken = response.data.client_secret.value;

      console.log("Token received, creating peer connection...");

      // Create peer connection
      this.peerConnection = new RTCPeerConnection();

      // Setup audio element for playback
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;

      // Handle incoming audio track
      this.peerConnection.ontrack = (event) => {
        console.log("Received remote audio track");
        this.audioElement.srcObject = event.streams[0];
        if (this.onAudioReceivedCallback) {
          this.onAudioReceivedCallback();
        }
      };

      // Setup data channel for events and function calls
      this.dataChannel = this.peerConnection.createDataChannel("oai-events");

      this.dataChannel.onopen = () => {
        console.log("Data channel opened");
        this.isConnected = true;

        // Send session configuration
        this.sendSessionUpdate();

        if (this.onConnectedCallback) {
          this.onConnectedCallback();
        }
      };

      this.dataChannel.onclose = () => {
        console.log("Data channel closed");
        this.isConnected = false;
        if (this.onDisconnectedCallback) {
          this.onDisconnectedCallback();
        }
      };

      this.dataChannel.onmessage = (event) => {
        this.handleDataChannelMessage(event.data);
      };

      // Get microphone stream (but muted by default)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Mute the track by default
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

      // Add audio track to peer connection
      this.mediaStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.mediaStream);
      });

      // Create and set local description
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to OpenAI and get answer
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect: ${sdpResponse.statusText}`);
      }

      const answerSdp = await sdpResponse.text();
      const answer = {
        type: "answer",
        sdp: answerSdp,
      };

      await this.peerConnection.setRemoteDescription(answer);

      console.log("WebRTC connection established");
    } catch (error) {
      console.error("Error connecting:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message || "Failed to connect");
      }
      throw error;
    }
  }

  /**
   * Send session configuration
   */
  sendSessionUpdate() {
    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions:
          "You are a specialized voice assistant for the 'City of Goodness' project, designed EXCLUSIVELY to help users find businesses and services in Sacramento County, California. " +
          "\n\nYour PRIMARY FUNCTION: Search and provide information about local businesses, restaurants, services, and commercial establishments when users request them." +
          "\n\nIMPORTANT LANGUAGE RULE: Always respond in the SAME LANGUAGE the user speaks to you. Most commonly this will be Russian, Ukrainian, or American English, but it can be any other language. Mirror the user's language exactly." +
          "\n\nREQUEST VALIDATION: Before responding, analyze if the user's request is related to finding/searching for a business, place, restaurant, or service. " +
          "\n- IF YES (search-related): Use the search_nearby_business function to help them. When you receive search results, use ONLY the 'voice_response' field from the function output. Do NOT read through individual results. Just say exactly what's in the voice_response field." +
          "\n- IF NO (general conversation, jokes, weather, philosophy, etc.): Politely decline in a friendly, slightly humorous way (but stay professional - no overly familiar tone). For example: 'Хм, это интересный вопрос, но я специализируюсь исключительно на поиске бизнесов в Sacramento County. Может, помочь найти какое-нибудь заведение поблизости?' or 'Ha, I'd love to chat, but I'm really just here to help you find great businesses in Sacramento County! Need to find something nearby?' Adapt the tone and language to match the user's input." +
          "\n\nRemember: Stay conversational, friendly, and helpful, but keep focused on your core mission - helping people discover local businesses.",
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: [
          {
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
              },
              required: ["query"],
            },
          },
        ],
        tool_choice: "auto",
      },
    };

    this.sendMessage(sessionUpdate);
  }

  /**
   * Handle incoming data channel messages
   */
  async handleDataChannelMessage(data) {
    try {
      const message = JSON.parse(data);

      // Log events (except audio deltas)
      if (
        message.type &&
        !message.type.includes("audio.delta") &&
        !message.type.includes("input_audio_buffer")
      ) {
        console.log("Event:", message.type);
      }

      // Handle different message types
      switch (message.type) {
        case "conversation.item.input_audio_transcription.completed":
          if (message.transcript && this.onTranscriptCallback) {
            this.onTranscriptCallback(message.transcript);
          }
          break;

        case "response.audio_transcript.delta":
          // Accumulate assistant transcript
          if (message.delta) {
            this.assistantTranscript += message.delta;
          }
          break;

        case "response.audio_transcript.done":
          // Send complete assistant transcript
          if (message.transcript && this.onAssistantTranscriptCallback) {
            this.onAssistantTranscriptCallback(message.transcript);
          }
          // Reset for next response
          this.assistantTranscript = "";
          break;

        case "response.audio.delta":
          // Audio is handled via audio track
          break;

        case "response.function_call_arguments.done":
          await this.handleFunctionCall(message);
          break;

        case "error":
          console.error("OpenAI error:", message);
          if (this.onErrorCallback) {
            this.onErrorCallback(message.error?.message || "Unknown error");
          }
          break;

        default:
          // Log other events for debugging
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  /**
   * Handle function calls from OpenAI
   */
  async handleFunctionCall(message) {
    const { call_id, name, arguments: argsString } = message;

    console.log(`Function call: ${name}`);

    if (name === "search_nearby_business") {
      try {
        const args = JSON.parse(argsString);
        const { query } = args;

        // Use stored location
        const latitude = this.userLocation.latitude || 38.5816;
        const longitude = this.userLocation.longitude || -121.4944;

        console.log(`Executing search: ${query} at ${latitude}, ${longitude}`);

        // Call our search API
        const response = await axios.post(`${API_URL}/api/search`, {
          query,
          latitude,
          longitude,
        });

        const searchResults = response.data;

        // Send function output back to OpenAI (only voice_response for narration)
        const functionOutput = {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: call_id,
            output: searchResults.voiceResponse,
          },
        };

        this.sendMessage(functionOutput);

        // Trigger response generation
        this.sendMessage({ type: "response.create" });

        // Send results to UI
        if (this.onSearchResultsCallback && searchResults.results) {
          this.onSearchResultsCallback(searchResults.results);
        }

        console.log(
          `Search completed, found ${searchResults.results.length} results`
        );
      } catch (error) {
        console.error("Error handling function call:", error);

        // Send error back to OpenAI
        const errorOutput = {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: call_id,
            output: JSON.stringify({
              success: false,
              error: error.message,
            }),
          },
        };

        this.sendMessage(errorOutput);
        this.sendMessage({ type: "response.create" });
      }
    }
  }

  /**
   * Send message via data channel
   */
  sendMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn("Data channel not ready, message not sent:", message.type);
    }
  }

  /**
   * Update user location
   */
  setUserLocation(latitude, longitude) {
    this.userLocation = { latitude, longitude };
    console.log("User location updated:", latitude, longitude);
  }

  /**
   * Register callback for connection established
   */
  onConnected(callback) {
    this.onConnectedCallback = callback;
  }

  /**
   * Register callback for disconnection
   */
  onDisconnected(callback) {
    this.onDisconnectedCallback = callback;
  }

  /**
   * Register callback for transcript
   */
  onTranscript(callback) {
    this.onTranscriptCallback = callback;
  }

  /**
   * Register callback for assistant transcript
   */
  onAssistantTranscript(callback) {
    this.onAssistantTranscriptCallback = callback;
  }

  /**
   * Register callback for search results
   */
  onSearchResults(callback) {
    this.onSearchResultsCallback = callback;
  }

  /**
   * Register callback for audio received
   */
  onAudioReceived(callback) {
    this.onAudioReceivedCallback = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Register callback for microphone state changes
   */
  onMicrophoneState(callback) {
    this.onMicrophoneStateCallback = callback;
  }

  /**
   * Start microphone
   */
  async startMicrophone() {
    if (this.isMicrophoneActive || !this.mediaStream) {
      return;
    }

    try {
      console.log("Starting microphone...");

      // Enable audio tracks
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      this.isMicrophoneActive = true;

      if (this.onMicrophoneStateCallback) {
        this.onMicrophoneStateCallback(true);
      }

      console.log("Microphone started");
    } catch (error) {
      console.error("Error starting microphone:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback("Failed to start microphone");
      }
      throw error;
    }
  }

  /**
   * Stop microphone
   */
  stopMicrophone() {
    if (!this.isMicrophoneActive || !this.mediaStream) {
      return;
    }

    console.log("Stopping microphone...");

    // Disable audio tracks (but don't stop them completely)
    this.mediaStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    this.isMicrophoneActive = false;

    if (this.onMicrophoneStateCallback) {
      this.onMicrophoneStateCallback(false);
    }

    console.log("Microphone stopped");
  }

  /**
   * Toggle microphone on/off
   */
  async toggleMicrophone() {
    if (this.isMicrophoneActive) {
      this.stopMicrophone();
    } else {
      await this.startMicrophone();
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    // Stop and cleanup media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }

    this.isConnected = false;
    this.isMicrophoneActive = false;
  }
}
