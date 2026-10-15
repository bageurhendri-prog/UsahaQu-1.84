import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DeviceProvider } from './context/DeviceContext';
import { registerServiceWorker } from './utils/swRegistration';

// Inisialisasi Service Worker PWA dengan strategi Stale-While-Revalidate
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <DeviceProvider>
    <App />
  </DeviceProvider>
);

