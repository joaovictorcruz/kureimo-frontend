import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LogtoProvider } from '@logto/react';
import App from './App.jsx';

const config = {
  endpoint:  import.meta.env.VITE_LOGTO_ENDPOINT,
  appId:     import.meta.env.VITE_LOGTO_APP_ID,
  resources: [import.meta.env.VITE_LOGTO_RESOURCE],
  scopes:    ['openid', 'profile', 'email', 'phone', 'offline_access'],
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LogtoProvider config={config}>
        <App />
      </LogtoProvider>
    </BrowserRouter>
  </StrictMode>,
);