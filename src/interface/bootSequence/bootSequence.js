import { bootSequenceLines } from './bootSequenceLines.js';

export { bootSequenceLines };

let bootSequenceActive = false;
let bootSequenceTimer = null;
let bootSequenceHideTimer = null;
let bootSequenceWakeListenersAttached = false;

const getProjectRootUrl = () => {
  const pathname = window.location.pathname;
  const srcIndex = pathname.indexOf('/src/');
  if (srcIndex !== -1) {
    const rootPath = pathname.slice(0, srcIndex) || '/';
    return new URL(rootPath.endsWith('/') ? rootPath : `${rootPath}/`, window.location.href).href;
  }
  return new URL('./', window.location.href).href;
};

const getUefiUrl = () => new URL('src/interface/UEFI/index.html', getProjectRootUrl()).href;

const attachShutdownWakeListeners = (callback) => {
  if (bootSequenceWakeListenersAttached) return;
  bootSequenceWakeListenersAttached = true;

  const wakeHandler = () => {
    document.removeEventListener('keydown', wakeHandler);
    document.removeEventListener('mousedown', wakeHandler);
    document.removeEventListener('touchstart', wakeHandler);
    window.removeEventListener('keydown', wakeHandler);
    window.removeEventListener('mousedown', wakeHandler);
    window.removeEventListener('touchstart', wakeHandler);
    bootSequenceWakeListenersAttached = false;
    callback();
  };

  document.addEventListener('keydown', wakeHandler, { once: true });
  document.addEventListener('mousedown', wakeHandler, { once: true });
  document.addEventListener('touchstart', wakeHandler, { once: true });
  window.addEventListener('keydown', wakeHandler, { once: true });
  window.addEventListener('mousedown', wakeHandler, { once: true });
  window.addEventListener('touchstart', wakeHandler, { once: true });
};

export const redirectToUefiInstantly = (delayMs = 2000) => {
  setTimeout(() => {
    window.location.replace(getUefiUrl());
  }, delayMs);
};

export const redirectToLogin = (target = '../login/index.html') => {
  const loginUrl = new URL(target, window.location.href).href;
  window.location.replace(loginUrl);
};

export const showShutdownScreen = () => {
  const bootScreen = document.getElementById('bootScreen') || document.querySelector('.boot-screen');
  if (bootScreen) {
    bootScreen.classList.remove('is-visible');
    bootScreen.classList.add('hidden');
    bootScreen.style.display = 'flex';
    bootScreen.setAttribute('aria-hidden', 'true');
    bootScreen.style.background = '#000';
  }

  document.body.style.cursor = 'none';
  document.body.style.background = '#000';

  attachShutdownWakeListeners(() => {
    redirectToLogin();
  });
};

export const stopBootSequence = () => {
  if (bootSequenceTimer) {
    clearTimeout(bootSequenceTimer);
    bootSequenceTimer = null;
  }
  if (bootSequenceHideTimer) {
    clearTimeout(bootSequenceHideTimer);
    bootSequenceHideTimer = null;
  }
  bootSequenceActive = false;
};

export const isBootingActive = () => bootSequenceActive;

export const startBootSequence = (options = {}) => {
  const {
    bootDuration = 6500,
    hideDuration = 1000,
    mode = 'boot',
    onComplete,
    onShutdown,
    onF2Detected
  } = options;

  stopBootSequence();
  bootSequenceActive = true;
  const bootScreen = document.getElementById('bootScreen') || document.querySelector('.boot-screen');

  if (bootScreen) {
    bootScreen.classList.remove('hidden');
    bootScreen.classList.add('is-visible');
    bootScreen.style.display = 'flex';
    bootScreen.setAttribute('aria-hidden', 'false');
    bootScreen.style.background = '#000';
  }

  const handleF2 = (event) => {
    if (event.key !== 'F2') return;
    event.preventDefault();
    event.stopPropagation();
    stopBootSequence();
    if (typeof onF2Detected === 'function') {
      onF2Detected();
    }
    redirectToUefiInstantly(2000);
  };

  document.addEventListener('keydown', handleF2);
  window.addEventListener('keydown', handleF2);

  bootSequenceTimer = setTimeout(() => {
    document.removeEventListener('keydown', handleF2);
    window.removeEventListener('keydown', handleF2);

    if (mode === 'shutdown') {
      bootSequenceActive = false;
      if (typeof onShutdown === 'function') {
        onShutdown();
      } else {
        showShutdownScreen();
      }
      return;
    }

    if (bootScreen) {
      bootScreen.classList.remove('is-visible');
      bootScreen.classList.add('hidden');
    }

    bootSequenceHideTimer = setTimeout(() => {
      bootSequenceActive = false;
      if (bootScreen) {
        bootScreen.style.display = 'none';
        bootScreen.setAttribute('aria-hidden', 'true');
      }
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, hideDuration);
  }, bootDuration);
};
