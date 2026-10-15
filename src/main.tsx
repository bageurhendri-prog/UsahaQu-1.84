import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DeviceProvider } from './context/DeviceContext';

createRoot(document.getElementById('root')!).render(
  <DeviceProvider>
    <App />
  </DeviceProvider>
);
