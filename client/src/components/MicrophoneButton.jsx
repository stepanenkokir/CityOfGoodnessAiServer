import React from "react";
import "./MicrophoneButton.css";

/**
 * Microphone button component with visual states
 * @param {Object} props - Component props
 * @param {boolean} props.isRecording - Whether recording is active
 * @param {boolean} props.isConnected - Whether WebSocket is connected
 * @param {Function} props.onClick - Click handler
 */
export function MicrophoneButton({ isRecording, isConnected, onClick }) {
  const getButtonClass = () => {
    if (!isConnected) return "mic-button disabled";
    if (isRecording) return "mic-button recording";
    return "mic-button";
  };

  const getButtonText = () => {
    if (!isConnected) return "Connecting...";
    if (isRecording) return "Listening... (click to stop)";
    return "Click to Start";
  };

  return (
    <div className="mic-container">
      <button
        className={getButtonClass()}
        onClick={onClick}
        disabled={!isConnected}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <div className="mic-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </div>
      </button>
      <p className="mic-label">{getButtonText()}</p>
    </div>
  );
}
