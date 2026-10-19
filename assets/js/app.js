import { initUI } from './modules/ui.js';
import { initCatalog } from './modules/catalog.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar interface e escutas de eventos
  initUI();
  initCatalog();

  // Registo do Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registado com sucesso no escopo:', reg.scope))
      .catch((err) => console.error('Erro ao registar Service Worker:', err));
  }
});