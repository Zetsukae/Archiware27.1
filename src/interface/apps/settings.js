const wallpaperBasePath = '../public/wallpapers/';
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
  soundInput: 75
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
    } else {
      const path = `${wallpaperBasePath}${fileName}`;
      body.style.backgroundImage = `url("${path}")`;
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
      <img src="${wallpaperBasePath}${wallpaper.file}" alt="${wallpaper.label}" />
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
  const dockLabelsToggle = windowEl.querySelector('#dockLabelsToggle');
  const dockAutoHideToggle = windowEl.querySelector('#dockAutoHideToggle');
  const wallpaperGrid = windowEl.querySelector('#wallpaperGrid');
  const localWallpaperInput = windowEl.querySelector('#localWallpaperInput');
  const chooseLocalWallpaperButton = windowEl.querySelector('#chooseLocalWallpaperButton');
  const supportButton = windowEl.querySelector('#supportButton');

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

  setActiveTab('general');
};
