const getProjectRootUrl = () => {
  const pathname = window.location.pathname;
  const srcIndex = pathname.indexOf('/src/');
  if (srcIndex !== -1) {
    const rootPath = pathname.slice(0, srcIndex) || '/';
    return new URL(rootPath.endsWith('/') ? rootPath : `${rootPath}/`, window.location.href).href;
  }
  return new URL('./', window.location.href).href;
};

const getWallpaperAssetUrl = (fileName) => {
  return new URL(`src/public/wallpapers/${fileName}`, getProjectRootUrl()).href;
};

const availableWallpapers = [
  { file: 'wallpaper.png', label: 'Default' },
  { file: 'Archiware24.jpeg', label: 'Archiware 24' }
];

let wallpaperChangeRequestId = 0;

const defaultSettings = {
  wallpaper: 'wallpaper.png',
  customWallpaper: '',
  transparency: 40,
  darkMode: false,
  notifications: true,
  powerSaver: false,
  dockLabels: true,
  dockAutoHide: false,
  soundOutput: 70,
  soundInput: 75,
  protonEnabled: true,
  wineEnabled: true,
  protonVersion: 'GE-Proton',
  optimizeForGaming: false
};

const loadAppSettings = () => {
  try {
    const saved = localStorage.getItem('archiwareSettings');
    if (!saved) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (error) {
    return { ...defaultSettings };
  }
};

export const appSettings = loadAppSettings();

export const saveAppSettings = () => {
  try {
    localStorage.setItem('archiwareSettings', JSON.stringify(appSettings));
  } catch (error) {
    // ignore storage errors
  }
};

export const applyWindowTransparency = (value) => {
  const alpha = 0.08 + (Number(value) / 100) * 0.16;
  document.documentElement.style.setProperty('--window-opacity', alpha.toFixed(3));
  appSettings.transparency = Number(value);
  saveAppSettings();
};

export const applyDarkMode = (enabled) => {
  document.body.classList.toggle('dark-mode', Boolean(enabled));
  appSettings.darkMode = Boolean(enabled);
  saveAppSettings();
};

export const applyWallpaper = (fileName) => {
  if (!fileName) return;
  wallpaperChangeRequestId += 1;
  const currentRequestId = wallpaperChangeRequestId;
  const body = document.body;
  body.style.transition = 'opacity 0.3s ease-in-out';
  body.style.opacity = '0';

  setTimeout(() => {
    if (currentRequestId !== wallpaperChangeRequestId) return;

    if (fileName === 'custom' && appSettings.customWallpaper) {
      body.style.backgroundImage = `url("${appSettings.customWallpaper}")`;
      localStorage.setItem('archiware_wallpaper', appSettings.customWallpaper);
    } else {
      const path = getWallpaperAssetUrl(fileName);
      body.style.backgroundImage = `url("${path}")`;
      localStorage.setItem('archiware_wallpaper', path);
    }
    appSettings.wallpaper = fileName;
    saveAppSettings();

    setTimeout(() => {
      if (currentRequestId !== wallpaperChangeRequestId) return;
      body.style.opacity = '1';
    }, 10);
  }, 150);

  setTimeout(() => {
    if (currentRequestId !== wallpaperChangeRequestId) return;
    body.style.transition = '';
  }, 600);
};

export const applyCustomWallpaper = (file) => {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target.result;
    appSettings.customWallpaper = dataUrl;
    localStorage.setItem('archiware_wallpaper', dataUrl);
    applyWallpaper('custom');
    saveAppSettings();
  };
  reader.readAsDataURL(file);
};

export const applyDockSettings = () => {
  const dockEl = document.querySelector('.dock');
  if (!dockEl) return;
  dockEl.classList.toggle('dock--labels', Boolean(appSettings.dockLabels));
  dockEl.classList.toggle('dock--autohide', Boolean(appSettings.dockAutoHide));
  if (appSettings.dockAutoHide) {
    dockEl.classList.remove('is-visible');
  } else {
    dockEl.classList.add('is-visible');
  }
};

const updateDockAutoHideVisibility = (clientY) => {
  const dockEl = document.querySelector('.dock');
  if (!dockEl || !appSettings.dockAutoHide) return;
  const threshold = window.innerHeight - 80;
  const show = clientY >= threshold;
  dockEl.classList.toggle('is-visible', show);
};

document.addEventListener('mousemove', (event) => {
  updateDockAutoHideVisibility(event.clientY);
});

export const applySavedSettings = () => {
  applyWindowTransparency(appSettings.transparency);
  applyDarkMode(appSettings.darkMode);
  applyWallpaper(appSettings.wallpaper);
  applyDockSettings();
};

export const renderWallpaperOptions = (container) => {
  if (!container) return;
  container.innerHTML = '';

  const updateSelectionState = () => {
    const thumbs = container.querySelectorAll('.wallpaper-thumb');
    thumbs.forEach((thumb) => {
      thumb.classList.toggle('selected', thumb.dataset.wallpaperFile === appSettings.wallpaper);
    });
  };

  availableWallpapers.forEach((wallpaper) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'wallpaper-thumb';
    thumb.dataset.wallpaperFile = wallpaper.file;
    thumb.innerHTML = `
      <img src="${getWallpaperAssetUrl(wallpaper.file)}" alt="${wallpaper.label}" />
      <span>${wallpaper.label}</span>
    `;
    thumb.addEventListener('click', () => {
      applyWallpaper(wallpaper.file);
      appSettings.wallpaper = wallpaper.file;
      saveAppSettings();
      updateSelectionState();
    });
    container.appendChild(thumb);
  });

  if (appSettings.customWallpaper) {
    const customThumb = document.createElement('button');
    customThumb.type = 'button';
    customThumb.className = 'wallpaper-thumb';
    customThumb.dataset.wallpaperFile = 'custom';
    customThumb.innerHTML = `
      <div class="wallpaper-custom-placeholder">Local wallpaper</div>
      <span>Custom image</span>
    `;
    customThumb.addEventListener('click', () => {
      applyWallpaper('custom');
      appSettings.wallpaper = 'custom';
      saveAppSettings();
      updateSelectionState();
    });
    container.appendChild(customThumb);
  }

  updateSelectionState();
};

const resolveAvatarUrl = (avatarValue) => {
  if (!avatarValue) return '';
  if (avatarValue.startsWith('data:') || avatarValue.startsWith('http://') || avatarValue.startsWith('https://') || avatarValue.startsWith('blob:')) {
    return avatarValue;
  }
  if (avatarValue.startsWith('/')) {
    return `${window.location.origin}${avatarValue}`;
  }
  if (avatarValue.includes('/')) {
    return avatarValue;
  }
  return new URL(`src/public/avatars/${avatarValue}`, getProjectRootUrl()).href;
};

export const initSettingsWindow = (windowEl) => {
  if (!windowEl) return;

  const tabItems = windowEl.querySelectorAll('[data-settings-tab]');
  const panels = windowEl.querySelectorAll('[data-settings-panel]');
  const transparencySlider = windowEl.querySelector('#transparencySlider');
  const darkModeToggle = windowEl.querySelector('#darkModeToggle');
  const soundAccessButton = windowEl.querySelector('#soundAccessButton');
  const soundOutputSlider = windowEl.querySelector('#soundOutputSlider');
  const soundInputSlider = windowEl.querySelector('#soundInputSlider');
  const notificationsToggle = windowEl.querySelector('#notificationsToggle');
  const powerSaverToggle = windowEl.querySelector('#powerSaverToggle');
  const protonToggle = windowEl.querySelector('#protonToggle');
  const wineToggle = windowEl.querySelector('#wineToggle');
  const protonVersionField = windowEl.querySelector('#protonVersionField');
  const protonVersionSelect = windowEl.querySelector('#protonVersionSelect');
  const optimizeGamingToggle = windowEl.querySelector('#optimizeGamingToggle');
  const dockLabelsToggle = windowEl.querySelector('#dockLabelsToggle');
  const dockAutoHideToggle = windowEl.querySelector('#dockAutoHideToggle');
  const wallpaperGrid = windowEl.querySelector('#wallpaperGrid');
  const localWallpaperInput = windowEl.querySelector('#localWallpaperInput');
  const chooseLocalWallpaperButton = windowEl.querySelector('#chooseLocalWallpaperButton');
  const supportButton = windowEl.querySelector('#supportButton');
  const settingsAvatarButton = windowEl.querySelector('#settingsAvatarButton');
  const settingsAvatarPicker = windowEl.querySelector('#settingsAvatarPicker');
  const settingsAvatarPreview = windowEl.querySelector('#settingsAvatarPreview');
  const settingsAvatarOptions = windowEl.querySelectorAll('.account-avatar-option[data-avatar]');
  const accountSidebarAvatar = document.getElementById('accountSidebarAvatar');
  const settingsCustomAvatarButton = windowEl.querySelector('#settingsCustomAvatarButton');
  const settingsCustomAvatarInput = windowEl.querySelector('#settingsCustomAvatarInput');
  const settingsUsernameInput = windowEl.querySelector('#settingsUsernameInput');
  const settingsPasswordInput = windowEl.querySelector('#settingsPasswordInput');
  const adminToggle = windowEl.querySelector('#adminToggle');

  const setActiveTab = (tabKey) => {
    tabItems.forEach((item) => item.classList.toggle('active', item.dataset.settingsTab === tabKey));
    panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.settingsPanel === tabKey));
  };

  tabItems.forEach((item) => {
    item.addEventListener('click', () => setActiveTab(item.dataset.settingsTab));
  });

  if (transparencySlider) {
    transparencySlider.value = appSettings.transparency;
    transparencySlider.addEventListener('input', (event) => {
      applyWindowTransparency(event.target.value);
    });
  }

  if (darkModeToggle) {
    darkModeToggle.checked = appSettings.darkMode;
    darkModeToggle.addEventListener('change', (event) => {
      applyDarkMode(event.target.checked);
    });
  }

  if (soundAccessButton) {
    soundAccessButton.addEventListener('click', () => {
      setActiveTab('sound');
    });
  }

  if (soundOutputSlider) {
    soundOutputSlider.value = appSettings.soundOutput;
    soundOutputSlider.addEventListener('input', (event) => {
      appSettings.soundOutput = Number(event.target.value);
      saveAppSettings();
    });
  }

  if (soundInputSlider) {
    soundInputSlider.value = appSettings.soundInput;
    soundInputSlider.addEventListener('input', (event) => {
      appSettings.soundInput = Number(event.target.value);
      saveAppSettings();
    });
  }

  if (notificationsToggle) {
    notificationsToggle.checked = appSettings.notifications;
    notificationsToggle.addEventListener('change', (event) => {
      appSettings.notifications = event.target.checked;
      saveAppSettings();
      window.dispatchEvent(new CustomEvent(appSettings.notifications ? 'archiware:notifications-enabled' : 'archiware:notifications-disabled', { bubbles: true }));
    });
  }

  if (powerSaverToggle) {
    powerSaverToggle.checked = appSettings.powerSaver;
    powerSaverToggle.addEventListener('change', (event) => {
      appSettings.powerSaver = event.target.checked;
      saveAppSettings();
    });
  }

  const syncProtonVersionVisibility = () => {
    const isEnabled = Boolean(appSettings.protonEnabled);
    if (protonVersionField) {
      protonVersionField.classList.toggle('is-hidden', !isEnabled);
      protonVersionField.setAttribute('aria-hidden', String(!isEnabled));
    }
    if (protonVersionSelect) {
      protonVersionSelect.disabled = !isEnabled;
    }
  };

  if (protonToggle) {
    protonToggle.checked = appSettings.protonEnabled;
    protonToggle.addEventListener('change', (event) => {
      appSettings.protonEnabled = event.target.checked;
      syncProtonVersionVisibility();
      saveAppSettings();
    });
  }

  if (wineToggle) {
    wineToggle.checked = appSettings.wineEnabled;
    wineToggle.addEventListener('change', (event) => {
      appSettings.wineEnabled = event.target.checked;
      saveAppSettings();
    });
  }

  if (protonVersionSelect) {
    protonVersionSelect.value = appSettings.protonVersion || 'GE-Proton';
    protonVersionSelect.addEventListener('change', (event) => {
      appSettings.protonVersion = event.target.value;
      saveAppSettings();
    });
  }

  syncProtonVersionVisibility();

  if (optimizeGamingToggle) {
    optimizeGamingToggle.checked = Boolean(appSettings.optimizeForGaming);
    optimizeGamingToggle.addEventListener('change', (event) => {
      appSettings.optimizeForGaming = event.target.checked;
      saveAppSettings();
    });
  }

  if (dockLabelsToggle) {
    dockLabelsToggle.checked = appSettings.dockLabels;
    dockLabelsToggle.addEventListener('change', (event) => {
      appSettings.dockLabels = event.target.checked;
      applyDockSettings();
      saveAppSettings();
    });
  }

  if (dockAutoHideToggle) {
    dockAutoHideToggle.checked = appSettings.dockAutoHide;
    dockAutoHideToggle.addEventListener('change', (event) => {
      appSettings.dockAutoHide = event.target.checked;
      applyDockSettings();
      saveAppSettings();
    });
  }

  if (wallpaperGrid) {
    renderWallpaperOptions(wallpaperGrid);
  }

  if (chooseLocalWallpaperButton && localWallpaperInput) {
    chooseLocalWallpaperButton.addEventListener('click', () => localWallpaperInput.click());
  }

  if (localWallpaperInput) {
    localWallpaperInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      applyCustomWallpaper(file);
      if (wallpaperGrid) renderWallpaperOptions(wallpaperGrid);
      event.target.value = '';
    });
  }

  if (supportButton) {
    supportButton.addEventListener('click', () => {
      window.open('https://github.com/SillyFlisy/Archiware', '_blank', 'noopener');
    });
  }

  const updateAccountAvatarUi = () => {
    const savedProfile = localStorage.getItem('archiware_profile');
    const avatarSrc = savedProfile ? resolveAvatarUrl(savedProfile) : resolveAvatarUrl('happy_avatar.svg');
    if (settingsAvatarPreview) {
      settingsAvatarPreview.src = avatarSrc;
    }
    if (accountSidebarAvatar) {
      accountSidebarAvatar.src = avatarSrc;
    }
  };

  const showAvatarPicker = () => {
    if (!settingsAvatarPicker) return;
    settingsAvatarPicker.classList.remove('hidden', 'closing');
    settingsAvatarPicker.setAttribute('aria-hidden', 'false');
    // Force layout before applying the visible state so the transition animates.
    void settingsAvatarPicker.offsetWidth;
    requestAnimationFrame(() => {
      settingsAvatarPicker.classList.add('visible');
    });
  };

  const hideAvatarPicker = () => {
    if (!settingsAvatarPicker) return;
    settingsAvatarPicker.classList.remove('visible');
    settingsAvatarPicker.classList.add('closing');
    settingsAvatarPicker.setAttribute('aria-hidden', 'true');
    const onTransitionEnd = (event) => {
      if (event.propertyName !== 'opacity') return;
      settingsAvatarPicker.classList.add('hidden');
      settingsAvatarPicker.classList.remove('closing');
      settingsAvatarPicker.removeEventListener('transitionend', onTransitionEnd);
    };
    settingsAvatarPicker.addEventListener('transitionend', onTransitionEnd);
  };

  if (settingsAvatarButton && settingsAvatarPicker) {
    settingsAvatarButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (settingsAvatarPicker.classList.contains('visible')) {
        hideAvatarPicker();
      } else {
        if (settingsAvatarPicker.classList.contains('hidden')) {
          settingsAvatarPicker.classList.remove('hidden');
        }
        showAvatarPicker();
      }
    });
  }

  settingsAvatarOptions.forEach((option) => {
    option.addEventListener('click', () => {
      const avatarValue = option.dataset.avatar;
      if (!avatarValue) return;
      const avatarUrl = resolveAvatarUrl(avatarValue);
      localStorage.setItem('archiware_profile', avatarUrl);
      updateAccountAvatarUi();
      window.dispatchEvent(new Event('archiwareProfileUpdated'));
      hideAvatarPicker();
    });
  });

  if (settingsCustomAvatarButton && settingsCustomAvatarInput) {
    settingsCustomAvatarButton.addEventListener('click', () => {
      settingsCustomAvatarInput.click();
    });

    settingsCustomAvatarInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target.result;
        localStorage.setItem('archiware_profile', dataUrl);
        updateAccountAvatarUi();
        window.dispatchEvent(new Event('archiwareProfileUpdated'));
        hideAvatarPicker();
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    });
  }

  if (settingsUsernameInput) {
    const storedUsername = localStorage.getItem('archiware_username') || 'User';
    settingsUsernameInput.value = storedUsername;
    settingsUsernameInput.addEventListener('input', (event) => {
      const value = event.target.value.trim() || 'User';
      localStorage.setItem('archiware_username', value);
      const welcomeUsername = document.getElementById('welcomeUsername');
      if (welcomeUsername) {
        welcomeUsername.textContent = value;
      }
    });
  }

  if (settingsPasswordInput) {
    const storedPassword = localStorage.getItem('archiware_password') || '';
    settingsPasswordInput.value = storedPassword;
    settingsPasswordInput.addEventListener('input', (event) => {
      localStorage.setItem('archiware_password', event.target.value);
    });
  }

  if (adminToggle) {
    const storedAdminRaw = localStorage.getItem('archiware_is_admin');
    const storedAdmin = storedAdminRaw === null ? true : storedAdminRaw === 'true';
    adminToggle.checked = storedAdmin;
    if (storedAdminRaw === null) {
      localStorage.setItem('archiware_is_admin', 'true');
    }
    adminToggle.addEventListener('change', (event) => {
      localStorage.setItem('archiware_is_admin', event.target.checked ? 'true' : 'false');
    });
  }

  updateAccountAvatarUi();

  document.addEventListener('click', (event) => {
    if (!settingsAvatarPicker || !settingsAvatarButton) return;
    const clickedInside = settingsAvatarPicker.contains(event.target) || settingsAvatarButton.contains(event.target);
    if (!clickedInside) {
      settingsAvatarPicker.classList.add('hidden');
      settingsAvatarPicker.setAttribute('aria-hidden', 'true');
    }
  });

  setActiveTab('account');
};
