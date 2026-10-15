import { initUI } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar interface e escutas de eventos
  initUI();

  // Registo do Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registado com sucesso no escopo:', reg.scope))
      .catch((err) => console.error('Erro ao registar Service Worker:', err));
  }
});