import { useState, useRef, useCallback } from "react";

/**
 * Custom hook for recording audio from microphone
 * Outputs PCM16 audio at 24kHz for OpenAI Realtime API
 * @returns {Object} Recording state and controls
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);

  const startRecording = useCallback(async (onAudioData) => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor for audio data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        if (onAudioData) {
          onAudioData(pcm16.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(err.message || "Failed to access microphone");
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}
