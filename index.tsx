import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSentry, SentryErrorBoundary } from './services/sentryService';

// Initialize Sentry error tracking
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SentryErrorBoundary
      fallback={({ error, componentStack, resetError }) => (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>We've been notified and are working to fix the issue.</p>
          <button onClick={resetError}>Try again</button>
          {import.meta.env.DEV && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>Error details (dev only)</summary>
              <pre>{error?.toString()}</pre>
              <pre>{componentStack}</pre>
            </details>
          )}
        </div>
      )}
    >
      <App />
    </SentryErrorBoundary>
  </React.StrictMode>
);