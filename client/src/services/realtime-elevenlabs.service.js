import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export class RealtimeElevenLabsClient {
  constructor() {
    this.websocket = null;
    this.audioContext = null;
    this.audioElement = null;
    this.isConnected = false;
    this.isMicrophoneActive = false;
    this.mediaStream = null;
    this.userLocation = { latitude: null, longitude: null };

    this.onConnectedCallback = null;
    this.onDisconnectedCallback = null;
    this.onTranscriptCallback = null;
    this.onAssistantTranscriptCallback = null;
    this.onSearchResultsCallback = null;
    this.onAudioReceivedCallback = null;
    this.onErrorCallback = null;
    this.onMicrophoneStateCallback = null;

    this.audioQueue = [];
    this.isPlaying = false;
  }

  async connect() {
    try {
      console.log("Requesting ElevenLabs signed URL...");

      const response = await axios.post(`${API_URL}/api/elevenlabs/session`);
      const signedUrl = response.data.signed_url;

      console.log("Signed URL received, connecting to WebSocket...");

      this.websocket = new WebSocket(signedUrl);

      this.websocket.onopen = () => {
        console.log("WebSocket connection opened");
        this.isConnected = true;

        if (this.onConnectedCallback) {
          this.onConnectedCallback();
        }
      };

      this.websocket.onclose = () => {
        console.log("WebSocket connection closed");
        this.isConnected = false;
        if (this.onDisconnectedCallback) {
          this.onDisconnectedCallback();
        }
      };

      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (this.onErrorCallback) {
          this.onErrorCallback("WebSocket connection error");
        }
      };

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      // Use 16kHz to match ElevenLabs output format
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)({
        sampleRate: 16000,
      });

      if (!this.audioElement) {
        this.audioElement = new Audio();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      console.log("ElevenLabs connection established");
    } catch (error) {
      console.error("Error connecting:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message || "Failed to connect");
      }
      throw error;
    }
  }

  async handleWebSocketMessage(data) {
    try {
      const message = JSON.parse(data);

      if (message.audio) {
        await this.handleBase64Audio(message.audio);
        if (this.onAudioReceivedCallback) {
          this.onAudioReceivedCallback();
        }
        return;
      }

      if (message.conversation_initiation_metadata_event) {
        console.log("Conversation initiated:", message);
        return;
      }

      if (message.user_transcription) {
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(message.user_transcription);
        }
        return;
      }

      if (message.agent_response) {
        if (this.onAssistantTranscriptCallback) {
          this.onAssistantTranscriptCallback(message.agent_response);
        }
        return;
      }

      if (message.interruption) {
        console.log("User interrupted");
        this.stopAudioPlayback();
        return;
      }

      if (message.ping_event) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          this.websocket.send(
            JSON.stringify({
              type: "pong",
              event_id: message.ping_event.event_id,
            })
          );
        }
        return;
      }

      const messageType = message.type;
      if (messageType) {
        console.log("ElevenLabs event:", messageType);

        switch (messageType) {
          case "conversation_initiation_metadata":
            console.log("Conversation initiated:", message);
            break;

          case "user_transcript":
            if (message.user_transcript && this.onTranscriptCallback) {
              this.onTranscriptCallback(message.user_transcript);
            }
            break;

          case "agent_response":
            if (message.agent_response && this.onAssistantTranscriptCallback) {
              this.onAssistantTranscriptCallback(message.agent_response);
            }
            break;

          case "audio":
            if (message.audio_event && message.audio_event.audio_base_64) {
              await this.handleBase64Audio(message.audio_event.audio_base_64);
            }
            if (this.onAudioReceivedCallback) {
              this.onAudioReceivedCallback();
            }
            break;

          case "interruption":
            console.log("User interrupted");
            this.stopAudioPlayback();
            break;

          case "ping":
            if (
              this.websocket &&
              this.websocket.readyState === WebSocket.OPEN
            ) {
              this.websocket.send(
                JSON.stringify({ type: "pong", event_id: message.event_id })
              );
            }
            break;

          case "tool_call":
            console.log("Tool call:", message.tool_name, message.parameters);
            await this.handleToolCall(message);
            break;

          case "error":
            console.error("ElevenLabs error:", message);
            if (this.onErrorCallback) {
              this.onErrorCallback(message.message || "Unknown error");
            }
            break;

          default:
            break;
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  async handleBase64Audio(base64Audio) {
    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32 for Web Audio API
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
      }

      // Create audio buffer (ElevenLabs uses 16kHz for output)
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        float32.length,
        16000 // sample rate
      );

      audioBuffer.getChannelData(0).set(float32);

      // Queue for playback
      this.audioQueue.push(audioBuffer);

      if (!this.isPlaying) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error("Error handling audio data:", error);
    }
  }

  playNextAudio() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift();

    // Create buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playNextAudio();
    };

    source.start(0);
  }

  stopAudioPlayback() {
    // Clear the queue
    this.audioQueue = [];
    this.isPlaying = false;

    // Note: We can't stop already playing BufferSourceNodes
    // but clearing the queue prevents new ones from playing
  }

  async handleToolCall(message) {
    const { tool_name, parameters, tool_call_id } = message;

    if (tool_name === "search_nearby_business") {
      try {
        const query = parameters.query;
        const latitude =
          parameters.latitude || this.userLocation.latitude || 38.5816;
        const longitude =
          parameters.longitude || this.userLocation.longitude || -121.4944;

        console.log(`Executing search: ${query} at ${latitude}, ${longitude}`);

        const response = await axios.post(`${API_URL}/api/search`, {
          query,
          latitude,
          longitude,
        });

        const searchResults = response.data;

        if (this.onSearchResultsCallback && searchResults.results) {
          this.onSearchResultsCallback(searchResults.results);
        }

        console.log(
          `Search completed, found ${searchResults.results.length} results`
        );
      } catch (error) {
        console.error("Error handling tool call:", error);
      }
    }
  }

  setUserLocation(latitude, longitude) {
    this.userLocation = { latitude, longitude };
    console.log("User location updated:", latitude, longitude);
  }

  onConnected(callback) {
    this.onConnectedCallback = callback;
  }

  onDisconnected(callback) {
    this.onDisconnectedCallback = callback;
  }

  onTranscript(callback) {
    this.onTranscriptCallback = callback;
  }

  onAssistantTranscript(callback) {
    this.onAssistantTranscriptCallback = callback;
  }

  onSearchResults(callback) {
    this.onSearchResultsCallback = callback;
  }

  onAudioReceived(callback) {
    this.onAudioReceivedCallback = callback;
  }

  onError(callback) {
    this.onErrorCallback = callback;
  }

  onMicrophoneState(callback) {
    this.onMicrophoneStateCallback = callback;
  }

  async startMicrophone() {
    if (this.isMicrophoneActive || !this.mediaStream || !this.websocket) {
      return;
    }

    try {
      console.log("Starting microphone...");

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(this.mediaStream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);

      processor.onaudioprocess = (e) => {
        if (
          this.websocket &&
          this.websocket.readyState === WebSocket.OPEN &&
          this.isMicrophoneActive
        ) {
          const inputData = e.inputBuffer.getChannelData(0);

          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          const base64Audio = this.arrayBufferToBase64(pcmData.buffer);

          const message = {
            user_audio_chunk: base64Audio,
          };

          this.websocket.send(JSON.stringify(message));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      this.audioProcessor = processor;
      this.audioSourceContext = audioContext;
      this.audioSource = source;
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

  arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  stopMicrophone() {
    if (!this.isMicrophoneActive) {
      return;
    }

    console.log("Stopping microphone...");

    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }

    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }

    if (this.audioSourceContext) {
      this.audioSourceContext.close();
      this.audioSourceContext = null;
    }

    this.isMicrophoneActive = false;

    if (this.onMicrophoneStateCallback) {
      this.onMicrophoneStateCallback(false);
    }

    console.log("Microphone stopped");
  }

  async toggleMicrophone() {
    if (this.isMicrophoneActive) {
      this.stopMicrophone();
    } else {
      await this.startMicrophone();
    }
  }

  disconnect() {
    this.stopMicrophone();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isConnected = false;
    this.isMicrophoneActive = false;
    this.audioQueue = [];
  }
}
