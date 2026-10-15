// Gestor de Interface e Navegação SPA
export function initUI() {
  setupNavigation();
  setupPWAInstaller();
}

function setupNavigation() {
  const navButtons = document.querySelectorAll('[data-target]');
  const sections = document.querySelectorAll('.app-section');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');

      // Atualizar botões ativos (desktop + móvel)
      navButtons.forEach((b) => {
        if (b.getAttribute('data-target') === targetId) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Alternar secções visíveis
      sections.forEach((sec) => {
        if (sec.id === targetId) {
          sec.classList.remove('hidden');
          sec.classList.add('active');
        } else {
          sec.classList.add('hidden');
          sec.classList.remove('active');
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// Gestão de Prompt de Instalação PWA
let deferredPrompt;
function setupPWAInstaller() {
  const banner = document.getElementById('pwa-install-banner');
  const installBtn = document.getElementById('btn-pwa-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (banner) banner.classList.remove('hidden');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Resultado do prompt de instalação: ${outcome}`);
      deferredPrompt = null;
      if (banner) banner.classList.add('hidden');
    });
  }
}