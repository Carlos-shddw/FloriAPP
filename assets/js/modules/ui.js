// Gestor de Interface e Navegação SPA
const DEMO_ACCOUNTS_KEY = 'botanica-demo-accounts';
const DEMO_SESSION_KEY = 'botanica-demo-session';
const PASSWORD_HASH_ITERATIONS = 210000;

export function initUI() {
  const navigateToSection = setupNavigation();
  setupAuthenticationScreen(navigateToSection);
  setupPWAInstaller();
}

function setupAuthenticationScreen(navigateToSection) {
  const welcomeScreen = document.getElementById('welcome-screen');
  const authScreen = document.getElementById('auth-screen');
  const appElements = document.querySelectorAll('.auth-gated');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const toast = document.getElementById('auth-toast');
  const toastMessage = document.getElementById('auth-toast-message');
  const returnButton = document.getElementById('btn-auth-return');
  let toastTimeout;
  let currentAccount = null;

  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  function showMode(mode) {
    const signingUp = mode === 'signup';
    loginForm.classList.toggle('hidden', signingUp);
    signupForm.classList.toggle('hidden', !signingUp);
    document.getElementById('login-switch').classList.toggle('hidden', signingUp);
    document.getElementById('signup-switch').classList.toggle('hidden', !signingUp);
    document.getElementById('auth-title').textContent = signingUp
      ? 'Cria o teu espaço verde'
      : 'Bem-vindo de volta, jardineiro!';
    document.getElementById('auth-description').textContent = signingUp
      ? 'Cria uma conta para começares a cuidar do teu jardim.'
      : 'Insere os teus dados para aceder ao teu jardim.';
  }

  function showAuthentication(mode = 'login') {
    welcomeScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    showMode(mode);
    window.scrollTo({ top: 0 });
  }

  function showWelcome() {
    currentAccount = null;
    authScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    appElements.forEach((element) => element.classList.add('hidden'));
    loginForm.reset();
    signupForm.reset();
    showMode('login');
    returnButton.textContent = 'Acesso';
    returnButton.setAttribute('aria-label', 'Voltar ao acesso');
    window.scrollTo({ top: 0 });
  }

  function showApp(account = null) {
    currentAccount = account;
    welcomeScreen.classList.add('hidden');
    authScreen.classList.add('hidden');
    appElements.forEach((element) => element.classList.remove('hidden'));
    navigateToSection(window.location.hash.slice(1), false);
    returnButton.textContent = account ? 'Terminar sessão' : 'Acesso';
    returnButton.setAttribute('aria-label', account ? `Terminar sessão de ${account.name}` : 'Voltar ao acesso');
    window.scrollTo({ top: 0 });
  }

  function readAccounts() {
    const savedAccounts = window.localStorage.getItem(DEMO_ACCOUNTS_KEY);
    if (!savedAccounts) return [];

    const accounts = JSON.parse(savedAccounts);
    if (!Array.isArray(accounts) || accounts.some((account) => (
      !account
      || typeof account.email !== 'string'
      || typeof account.name !== 'string'
      || typeof account.salt !== 'string'
      || typeof account.hash !== 'string'
      || !Number.isInteger(account.iterations)
    ))) {
      throw new Error('Os dados das contas de demonstração estão inválidos. Limpa os dados do site e tenta novamente.');
    }
    return accounts;
  }

  async function hashPassword(password, saltHex, iterations = PASSWORD_HASH_ITERATIONS) {
    if (!window.crypto?.subtle) {
      throw new Error('Este browser não disponibiliza a proteção necessária. Abre a aplicação através de HTTPS ou localhost.');
    }

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const hash = await window.crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: Uint8Array.from(saltHex.match(/.{2}/g), (byte) => Number.parseInt(byte, 16)),
      iterations,
      hash: 'SHA-256'
    }, keyMaterial, 256);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function createSalt() {
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => showAuthentication(button.dataset.authMode));
  });

  document.getElementById('btn-welcome-enter').addEventListener('click', () => showAuthentication('login'));
  document.getElementById('btn-welcome-signup').addEventListener('click', () => showAuthentication('signup'));

  document.querySelectorAll('[data-password-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordTarget);
      const icon = button.querySelector('.material-symbols-outlined');
      const showingPassword = input.type === 'password';
      input.type = showingPassword ? 'text' : 'password';
      icon.textContent = showingPassword ? 'visibility_off' : 'visibility';
      button.setAttribute('aria-label', showingPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe');
    });
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector('[type="submit"]');
    const email = loginForm.elements.email.value.trim().toLocaleLowerCase('pt-PT');
    const password = loginForm.elements.password.value;
    submitButton.disabled = true;
    submitButton.textContent = 'A validar...';

    try {
      const account = readAccounts().find((savedAccount) => savedAccount.email === email);
      if (!account || await hashPassword(password, account.salt, account.iterations) !== account.hash) {
        showToast('Email ou palavra-passe incorretos.');
        return;
      }

      window.localStorage.setItem(DEMO_SESSION_KEY, account.email);
      loginForm.reset();
      showApp(account);
      showToast(`Bem-vindo, ${account.name}!`);
    } catch (error) {
      console.error('Erro ao iniciar sessão de demonstração:', error);
      showToast(error instanceof Error ? error.message : 'Não foi possível iniciar sessão.');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Entrar <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>';
    }
  });

  const signupPassword = document.getElementById('signup-password');
  const confirmPassword = document.getElementById('signup-confirm-password');

  signupForm.elements.name.addEventListener('input', () => {
    signupForm.elements.name.setCustomValidity('');
  });
  confirmPassword.addEventListener('input', () => confirmPassword.setCustomValidity(''));
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (signupPassword.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity('As palavras-passe não coincidem.');
      confirmPassword.reportValidity();
      return;
    }

    const submitButton = signupForm.querySelector('[type="submit"]');
    const name = signupForm.elements.name.value.trim();
    const email = signupForm.elements.email.value.trim().toLocaleLowerCase('pt-PT');
    const password = signupPassword.value;
    if (!name) {
      signupForm.elements.name.setCustomValidity('Introduz o teu nome.');
      signupForm.elements.name.reportValidity();
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = 'A criar conta...';

    try {
      const accounts = readAccounts();
      if (accounts.some((account) => account.email === email)) {
        showToast('Já existe uma conta com este email. Inicia sessão.');
        return;
      }

      const salt = createSalt();
      const account = {
        name,
        email,
        salt,
        hash: await hashPassword(password, salt),
        iterations: PASSWORD_HASH_ITERATIONS
      };
      accounts.push(account);
      window.localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
      window.localStorage.setItem(DEMO_SESSION_KEY, account.email);
      signupForm.reset();
      showApp(account);
      showToast(`Conta criada. Bem-vindo, ${account.name}!`);
    } catch (error) {
      console.error('Erro ao criar conta de demonstração:', error);
      showToast(error instanceof Error ? error.message : 'Não foi possível criar a conta.');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Criar conta <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>';
    }
  });

  document.querySelectorAll('[data-auth-action="reset"]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast('As contas de demonstração não têm recuperação de palavra-passe. Cria uma conta com outro email.');
    });
  });

  document.getElementById('btn-explore-without-account').addEventListener('click', () => showApp());
  returnButton.addEventListener('click', () => {
    if (!currentAccount) {
      showWelcome();
      return;
    }

    try {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
      showWelcome();
      showToast('Sessão terminada.');
    } catch (error) {
      console.error('Erro ao terminar sessão de demonstração:', error);
      showToast(error instanceof Error ? error.message : 'Não foi possível terminar a sessão.');
    }
  });

  try {
    const sessionEmail = window.localStorage.getItem(DEMO_SESSION_KEY);
    if (sessionEmail) {
      const account = readAccounts().find((savedAccount) => savedAccount.email === sessionEmail);
      if (account) showApp(account);
      else window.localStorage.removeItem(DEMO_SESSION_KEY);
    }
  } catch (error) {
    console.error('Erro ao restaurar sessão de demonstração:', error);
    showToast(error instanceof Error ? error.message : 'Não foi possível restaurar a sessão.');
  }
}

function setupNavigation() {
  const navButtons = document.querySelectorAll('[data-target]');
  const sections = document.querySelectorAll('.app-section');

  function navigateToSection(targetId, updateHash = true) {
    const section = document.getElementById(targetId);
    if (!section || !section.matches('.app-section')) return;

    navButtons.forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-target') === targetId);
    });
    sections.forEach((appSection) => {
      const isTarget = appSection === section;
      appSection.classList.toggle('hidden', !isTarget);
      appSection.classList.toggle('active', isTarget);
    });

    if (updateHash && window.location.hash !== `#${targetId}`) {
      window.location.hash = targetId;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      navigateToSection(targetId);
    });
  });

  window.addEventListener('hashchange', () => {
    navigateToSection(window.location.hash.slice(1), false);
  });

  navigateToSection(window.location.hash.slice(1), false);
  return navigateToSection;
}

// Gestão de Prompt de Instalação PWA
let deferredPrompt;
function setupPWAInstaller() {
  const installBtn = document.getElementById('btn-pwa-install');
  const navbarContainer = installBtn.closest('.navbar-container');
  const toast = document.getElementById('auth-toast');
  const toastMessage = document.getElementById('auth-toast-message');
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;
  let toastTimeout;

  function hideInstallButton() {
    installBtn.classList.add('hidden');
    navbarContainer.classList.remove('install-available');
  }

  function showInstallMessage(message) {
    toastMessage.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove('visible'), 4500);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
    navbarContainer.classList.add('install-available');
  });

  if (isIOS && !isInstalled) {
    installBtn.classList.remove('hidden');
    navbarContainer.classList.add('install-available');
  }

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      if (isIOS && !isInstalled) {
        showInstallMessage('Para instalar no iPhone ou iPad, toca em Partilhar e escolhe «Adicionar ao ecrã principal».');
        return;
      }
      showInstallMessage('A instalação não está disponível neste browser. Abre a app através de HTTPS ou localhost num browser compatível.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Resultado do prompt de instalação: ${outcome}`);
    deferredPrompt = null;
    hideInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButton();
  });
}