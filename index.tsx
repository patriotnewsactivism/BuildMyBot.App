import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initSentry } from './services/sentryInit';
import { initPostHog } from './services/posthogInit';

// Initialize observability tools
initSentry(); // Error tracking and performance monitoring
initPostHog(); // Product analytics and user behavior tracking

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);