import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadDevice, repo, seedIfEmpty } from './data';
import './styles.css';

async function start() {
  await Promise.all([repo.ready(), loadDevice()]);
  await seedIfEmpty('papa');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
