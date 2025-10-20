import React from "react";
import "./ResultsList.css";

/**
 * Display list of business search results
 * @param {Object} props - Component props
 * @param {Array} props.results - Array of business results
 */
export function ResultsList({ results }) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="results-container">
      <h2 className="results-title">
        Found {results.length} Result{results.length === 1 ? "" : "s"}
      </h2>
      <div className="results-list">
        {results.map((business, index) => (
          <div key={business.id || index} className="business-card">
            <div className="business-header">
              <h3 className="business-name">{business.name}</h3>
              {business.source === "google_places" ? (
                <span className="source-badge google">Google Places</span>
              ) : (
                <span className="source-badge supabase">Supabase</span>
              )}
            </div>

            {business.description && (
              <p className="business-description">{business.description}</p>
            )}

            <div className="business-details">
              {business.address && (
                <div className="detail-item">
                  <svg
                    className="icon"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span>{business.address}</span>
                </div>
              )}

              {business.phone && (
                <div className="detail-item">
                  <svg
                    className="icon"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                  >
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                  <a href={`tel:${business.phone}`} className="detail-link">
                    {business.phone}
                  </a>
                </div>
              )}

              {business.website && (
                <div className="detail-item">
                  <svg
                    className="icon"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    Website
                  </a>
                </div>
              )}

              {business.latitude && business.longitude && (
                <div className="detail-item">
                  <svg
                    className="icon"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <a
                    href={`https://www.google.com/maps?q=${business.latitude},${business.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    View on Map
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
