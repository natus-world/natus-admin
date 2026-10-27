import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { NewVersion } from './NewVersion';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <NewVersion />
  </StrictMode>,
);
