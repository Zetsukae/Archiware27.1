import { appSettings, saveAppSettings, applyWindowTransparency, applyDarkMode, applyWallpaper, applyCustomWallpaper, applyDockSettings, applySavedSettings, initSettingsWindow } from './apps/settings.js';
import { initExplorerWindow, renderExplorerWindow, findExplorerNodeById, findExplorerNodePathByName, getExplorerDesktopNode, getExplorerSegments, navigateExplorerWindow, goBackExplorerWindow, goForwardExplorerWindow, createExplorerFolderInWindow, renameExplorerItemInWindow, buildUniqueExplorerItemName } from './apps/explorer.js';
import { initTextEditorWindow } from './apps/textEditor.js';
import { initPluberryWindow } from './apps/pluberry.js';
import { initBrowserWindow } from './apps/browser.js';
import { bootSequenceLines } from './bootSequence.js';

const clock = document.getElementById('clock');
const profileTrigger = document.getElementById('profileTrigger');
const profilePopup = document.getElementById('profilePopup');
const powerOffBtn = document.getElementById('powerOffBtn');
const restartBtn = document.getElementById('restartBtn');
const quickFilesBtn = document.getElementById('quickFilesBtn');
const shortcutToggleBtn = document.getElementById('shortcutToggleBtn');
const shortcutDropdown = document.getElementById('shortcutDropdown');
const powerOverlay = document.getElementById('powerOverlay');
const powerTitle = document.getElementById('powerTitle');
const powerLog = document.getElementById('powerLog');
const minimizedAppsContainer = document.getElementById('minimizedApps');
const calendarPopup = document.getElementById('calendarPopup');
const calendarDate = document.getElementById('calendarDate');
const calendarGrid = document.getElementById('calendarGrid');
const dockItems = document.querySelectorAll('.dock__item');
const runningDockApps = document.getElementById('runningDockApps');
let windows = document.querySelectorAll('.window');
let windowZIndex = 50;
const windowControls = document.querySelectorAll('.window__control');
const welcomeUsernameEl = document.getElementById('welcomeUsername');
const profileTitleEl = document.getElementById('profileTitle');
const profileSubtitleEl = document.getElementById('profileSubtitle');
const topbar = document.querySelector('.desktop__topbar');
const dock = document.querySelector('.dock');
const osLauncherOverlay = document.getElementById('osLauncherOverlay');
const osLauncherPanel = document.querySelector('.os-launcher-panel');
const osLauncherSearch = document.getElementById('osLauncherSearch');
const osLauncherPowerBtn = document.getElementById('osLauncherPowerBtn');
const osLauncherPowerMenu = document.getElementById('osLauncherPowerMenu');
const osLauncherAppList = document.getElementById('osLauncherAppList');
const osLauncherApps = [
  { id: 'explorer', label: 'Explorer', icon: '../public/icons/explorer.svg' },
  { id: 'settings', label: 'Settings', icon: '../public/icons/settings.svg' },
  { id: 'browser', label: 'Browser', icon: '../public/icons/browser.svg' },
  { id: 'music', label: 'Music', icon: '../public/icons/music.svg' },
  { id: 'pluberry', label: 'Pluberry', icon: '../public/icons/app.svg' },
  { id: 'editor', label: 'Text Editor', icon: '../public/icons/textEditor.svg' }
];
const appWindowCounters = { explorer: 1, settings: 1, editor: 0, pluberry: 0, browser: 0 };
const windowPlacementState = { offsetX: 30, offsetY: 30 };
let memoryKillSwitchTriggered = false;
let altKeyState = { isPressed: false, usedWithOtherKey: false };

const isLoginPage = window.location.pathname.includes('/login/');
const isSetupPage = window.location.pathname.endsWith('/setup.html') || window.location.pathname.includes('/setup/');
const isDesktopShellPage = window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/src/interface/index.html');
const hasCompletedSetup = localStorage.getItem('archiware_setup_complete') === 'true';
const isSessionActive = localStorage.getItem('archiware_session_active') === 'true';

if (hasCompletedSetup && !isLoginPage && !isSetupPage && isDesktopShellPage && !isSessionActive) {
  window.location.replace('./login/');
}

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
const redirectToUefiWithDelay = (delayMs = 1500) => {
  setTimeout(() => {
    window.location.replace(getUefiUrl());
  }, delayMs);
};

const redirectToLogin = (target = './login/') => {
  localStorage.setItem('archiware_session_active', 'false');
  window.location.href = target;
};

const getOpenWindowCount = () => {
  return Array.from(document.querySelectorAll('.window')).filter((win) => !win.classList.contains('is-closed') && !win.classList.contains('is-minimized')).length;
};

const getDockAppConfig = (appId) => {
  const appConfigs = {
    explorer: { label: 'Explorer', icon: '../public/icons/explorer.svg' },
    settings: { label: 'Settings', icon: '../public/icons/settings.svg' },
    browser: { label: 'Browser', icon: '../public/icons/browser.svg' },
    pluberry: { label: 'Pluberry', icon: '../public/icons/app.svg' },
    editor: { label: 'Text Editor', icon: '../public/icons/textEditor.svg' }
  };
  return appConfigs[appId] || null;
};

const refreshRunningDockApps = () => {
  if (!runningDockApps) return;

  const runningApps = Array.from(document.querySelectorAll('.window'))
    .filter((win) => !win.classList.contains('is-closed') && !win.classList.contains('is-minimized'))
    .map((win) => getAppIdForWindow(win.id))
    .filter(Boolean)
    .filter((appId, index, apps) => apps.indexOf(appId) === index)
    .filter((appId) => !['explorer', 'settings', 'browser', 'music'].includes(appId));

  runningDockApps.innerHTML = '';
  runningDockApps.classList.toggle('is-empty', runningApps.length === 0);

  const separator = document.querySelector('.dock__separator');
  if (separator) {
    separator.classList.toggle('is-hidden', runningApps.length === 0);
  }

  runningApps.forEach((appId) => {
    const config = getDockAppConfig(appId);
    if (!config) return;

    const button = document.createElement('button');
    button.className = 'dock__item dock__item--running';
    button.type = 'button';
    button.dataset.app = appId;
    button.setAttribute('aria-label', config.label);
    button.innerHTML = `<img src="${config.icon}" alt="${config.label}" />`;

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      launchAppWindow(appId);
    });

    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      showContextMenu(event.clientX, event.clientY, getDockMenuItems(appId));
    });

    runningDockApps.appendChild(button);
  });
};

const enforceMemoryLimit = () => {
  if (memoryKillSwitchTriggered) return;

  const openWindowCount = getOpenWindowCount();
  if (openWindowCount <= 100) return;

  memoryKillSwitchTriggered = true;

  const windowsToClose = Array.from(document.querySelectorAll('.window')).filter((win) => !win.classList.contains('is-closed'));
  windowsToClose.forEach((win) => {
    const closeBtn = win.querySelector('.window__control--close');
    if (closeBtn && !win.classList.contains('is-closed')) {
      closeBtn.click();
    }
  });

  showNotification('Saved from memory death...', { title: 'System protection', force: true, timeout: 4000 });
  window.setTimeout(() => {
    memoryKillSwitchTriggered = false;
  }, 800);
};

const getNextWindowPosition = (windowWidth = 900, windowHeight = 560) => {
  const desktopEl = document.querySelector('.desktop');
  const desktopRect = desktopEl?.getBoundingClientRect();
  const desktopWidth = desktopRect?.width || window.innerWidth || 1280;
  const desktopHeight = desktopRect?.height || window.innerHeight || 720;
  const padding = 24;
  const maxX = Math.max(padding, desktopWidth - windowWidth - padding);
  const maxY = Math.max(padding, desktopHeight - windowHeight - padding);

  const previousWindow = Array.from(document.querySelectorAll('.window'))
    .filter((win) => !win.classList.contains('is-closed') && !win.classList.contains('is-minimized') && win.id !== 'mainWindow')
    .sort((a, b) => Number(a.style.zIndex || 0) - Number(b.style.zIndex || 0))
    .pop();

  const baseX = previousWindow
    ? previousWindow.offsetLeft
    : Math.max(padding, Math.round((desktopWidth - windowWidth) / 2));
  const baseY = previousWindow
    ? previousWindow.offsetTop
    : Math.max(padding, Math.round((desktopHeight - windowHeight) / 2));

  let nextX = baseX + windowPlacementState.offsetX;
  let nextY = baseY + windowPlacementState.offsetY;

  if (nextX > maxX) {
    nextX = maxX;
    windowPlacementState.offsetX = -Math.abs(windowPlacementState.offsetX);
  } else if (nextX < padding) {
    nextX = padding;
    windowPlacementState.offsetX = Math.abs(windowPlacementState.offsetX);
  }

  if (nextY > maxY) {
    nextY = maxY;
    windowPlacementState.offsetY = -Math.abs(windowPlacementState.offsetY);
  } else if (nextY < padding) {
    nextY = padding;
    windowPlacementState.offsetY = Math.abs(windowPlacementState.offsetY);
  }

  return {
    x: Math.min(Math.max(nextX, padding), maxX),
    y: Math.min(Math.max(nextY, padding), maxY)
  };
};

let notificationCounter = 0;
const activeNotifications = [];
const notificationStack = document.createElement('div');
notificationStack.className = 'notification-stack';
notificationStack.addEventListener('click', (event) => {
  if (!activeNotifications.length) return;
  event.stopPropagation();
  if (activeNotifications.length === 1) {
    openNotificationCenter();
  } else {
    toggleNotificationCenter();
  }
});
document.body.appendChild(notificationStack);

const notificationCenter = document.createElement('div');
notificationCenter.className = 'notification-center';
document.body.appendChild(notificationCenter);

const getNotificationKey = (title, message) => `${title}::${message}`;

const renderNotificationCenter = () => {
  if (!activeNotifications.length) {
    notificationCenter.classList.remove('is-open');
    notificationCenter.innerHTML = '';
    return;
  }

  notificationCenter.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'notification-center__header';
  header.innerHTML = `<strong>Notifications</strong><span>${activeNotifications.length}</span>`;
  notificationCenter.appendChild(header);

  const list = document.createElement('div');
  list.className = 'notification-center__list';
  activeNotifications.forEach((item) => {
    const entry = document.createElement('div');
    entry.className = 'notification-center__item';
    entry.innerHTML = `
      <div class="notification-center__item-content">
        <div class="notification-center__item-title">${item.title}</div>
        <div class="notification-center__item-message">${item.message}</div>
      </div>
      <button class="notification-center__item-close" type="button" aria-label="Dismiss notification" data-id="${item.id}">×</button>
    `;

    const closeButton = entry.querySelector('.notification-center__item-close');
    closeButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      dismissNotificationFromCenter(item.id);
    });

    list.appendChild(entry);
  });
  notificationCenter.appendChild(list);
};

const openNotificationCenter = () => {
  if (!activeNotifications.length) return;
  notificationCenter.classList.add('is-open');
};

const closeNotificationCenter = () => {
  notificationCenter.classList.remove('is-open');
};

const toggleNotificationCenter = () => {
  if (!activeNotifications.length) return;
  notificationCenter.classList.toggle('is-open');
};

const handleNotificationHover = (event) => {
  const { clientX, clientY } = event;
  const viewportWidth = window.innerWidth;
  const topZoneHeight = 78;
  const centerBandWidth = Math.min(420, viewportWidth * 0.38);
  const isInTopCenterZone = clientY <= topZoneHeight && Math.abs(clientX - viewportWidth / 2) <= centerBandWidth / 2;
  const isHoveringNotificationUi = notificationCenter.contains(event.target) || notificationStack.contains(event.target);

  if (isHoveringNotificationUi) return;

  if (isInTopCenterZone && activeNotifications.length) {
    openNotificationCenter();
  } else {
    closeNotificationCenter();
  }
};

document.addEventListener('mousemove', handleNotificationHover);

const clearAllNotifications = () => {
  activeNotifications.forEach((entry) => {
    if (entry?.timeoutId) {
      window.clearTimeout(entry.timeoutId);
    }
  });
  activeNotifications.length = 0;
  notificationCenter.classList.remove('is-open');
  notificationCenter.innerHTML = '';
  notificationStack.innerHTML = '';
  updateNotificationStack();
};

const handleNotificationsDisabled = () => {
  clearAllNotifications();
};

window.addEventListener('archiware:notifications-disabled', handleNotificationsDisabled);
document.addEventListener('archiware:notifications-disabled', handleNotificationsDisabled);

const dismissNotification = (card, id) => {
  const index = activeNotifications.findIndex((item) => item.id === id);
  if (index >= 0) {
    const entry = activeNotifications[index];
    if (entry?.timeoutId) {
      window.clearTimeout(entry.timeoutId);
    }
    activeNotifications.splice(index, 1);
  }

  if (card?.isConnected) {
    card.classList.remove('is-visible');
    card.classList.add('is-leaving');
    renderNotificationCenter();
    window.setTimeout(() => card.remove(), 260);
    return;
  }

  renderNotificationCenter();
};

const dismissNotificationFromStack = (id) => {
  const index = activeNotifications.findIndex((item) => item.id === id);
  if (index >= 0) {
    const entry = activeNotifications[index];
    if (entry?.timeoutId) {
      window.clearTimeout(entry.timeoutId);
    }
    activeNotifications.splice(index, 1);
  }

  const card = notificationStack.querySelector(`#${CSS.escape(id)}`);
  if (card && card.isConnected) {
    card.classList.remove('is-visible');
    card.classList.add('is-leaving');
    window.setTimeout(() => card.remove(), 260);
  }
  window.setTimeout(updateNotificationStack, 20);
  renderNotificationCenter();
};

const dismissNotificationFromCenter = (id) => {
  const index = activeNotifications.findIndex((item) => item.id === id);
  if (index < 0) return;

  const entry = activeNotifications[index];
  if (entry?.timeoutId) {
    window.clearTimeout(entry.timeoutId);
  }

  activeNotifications.splice(index, 1);
  renderNotificationCenter();

  const card = notificationStack.querySelector(`#${CSS.escape(id)}`);
  if (card) {
    card.classList.remove('is-visible');
    card.classList.add('is-leaving');
    window.setTimeout(() => card.remove(), 260);
  }
};

const updateNotificationStack = () => {
  const cards = Array.from(notificationStack.querySelectorAll('.notification-card'));

  cards.forEach((card, index) => {
    const isLatest = index === cards.length - 1;
    card.classList.toggle('is-grouped', false);
    card.classList.toggle('is-hidden', false);
    card.classList.toggle('is-top', isLatest);
    card.style.zIndex = String(1000 - index);
  });
};

const showNotification = (message, options = {}) => {
  const { title = 'Archiware', timeout = 3200, force = false } = options;
  if (!appSettings.notifications) return null;

  const key = getNotificationKey(title, message);
  const existingEntry = activeNotifications.find((item) => item.key === key);
  if (existingEntry) {
    if (existingEntry.timeoutId) {
      window.clearTimeout(existingEntry.timeoutId);
    }
    if (existingEntry.card?.isConnected) {
      existingEntry.card.classList.remove('is-leaving');
      existingEntry.card.classList.add('is-visible');
    }
    existingEntry.timeoutId = window.setTimeout(() => {
      dismissNotificationFromStack(existingEntry.id);
    }, timeout);
    renderNotificationCenter();
    return { id: existingEntry.id, dismiss: () => dismissNotification(existingEntry.card, existingEntry.id) };
  }

  const id = `notification-${++notificationCounter}`;
  const card = document.createElement('div');
  card.className = 'notification-card';
  card.id = id;
  card.innerHTML = `
    <div class="notification-card__title">${title}</div>
    <div class="notification-card__message">${message}</div>
  `;

  const entry = { id, title, message, key, timeoutId: null, card };
  activeNotifications.push(entry);
  notificationStack.appendChild(card);
  renderNotificationCenter();
  requestAnimationFrame(() => {
    card.classList.add('is-visible');
    updateNotificationStack();
  });

  card.addEventListener('click', (event) => {
    event.stopPropagation();
    if (activeNotifications.length === 1) {
      openNotificationCenter();
    } else {
      toggleNotificationCenter();
    }
  });

  const dismiss = () => {
    dismissNotificationFromStack(id);
  };

  entry.timeoutId = window.setTimeout(dismiss, timeout);
  return { id, dismiss };
};

const launchUnavailableApp = (appName, message = 'Please update the app to launch it.') => {
  showNotification(`${appName} is not available yet. ${message}`, { title: 'App unavailable', force: true });
  return null;
};

function updateClock() {
  if (!clock) return;
  clock.textContent = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

updateClock();
setInterval(updateClock, 1000);

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const renderCalendar = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  calendarDate.textContent = `${day} ${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  calendarGrid.innerHTML = '';

  dayNames.forEach((label) => {
    const span = document.createElement('span');
    span.className = 'day-label';
    span.textContent = label;
    calendarGrid.appendChild(span);
  });

  for (let i = 0; i < startWeekday; i += 1) {
    const empty = document.createElement('span');
    calendarGrid.appendChild(empty);
  }

  for (let date = 1; date <= daysInMonth; date += 1) {
    const span = document.createElement('span');
    span.className = 'day-cell';
    span.textContent = date;
    if (date === day) {
      span.classList.add('today');
    }
    calendarGrid.appendChild(span);
  }
};

const hideCalendar = () => {
  if (!calendarPopup) return;
  calendarPopup.classList.remove('visible');
  calendarPopup.classList.add('hidden');
  calendarPopup.setAttribute('aria-hidden', 'true');
};

const showCalendar = () => {
  if (!calendarPopup) return;
  renderCalendar();
  calendarPopup.classList.remove('hidden');
  calendarPopup.classList.add('visible');
  calendarPopup.setAttribute('aria-hidden', 'false');
};

const toggleCalendar = () => {
  if (!calendarPopup) return;
  if (calendarPopup.classList.contains('visible')) {
    hideCalendar();
  } else {
    showCalendar();
  }
};

const toggleProfile = () => {
  if (!profilePopup) return;
  if (profilePopup.classList.contains('visible')) {
    profilePopup.classList.remove('visible');
    profilePopup.classList.add('hidden');
    profilePopup.setAttribute('aria-hidden', 'true');
  } else {
    profilePopup.classList.remove('hidden');
    profilePopup.classList.add('visible');
    profilePopup.setAttribute('aria-hidden', 'false');
  }
};

const minimizedWindows = new Map();

const getCurrentUsername = () => {
  const candidates = [
    localStorage.getItem('archiware_username'),
    localStorage.getItem('username'),
    localStorage.getItem('userName')
  ];
  const stored = candidates.find((value) => typeof value === 'string' && value.trim());
  return (stored || '').trim() || 'User';
};

const updateWelcomeUsername = () => {
  const username = getCurrentUsername();
  if (welcomeUsernameEl) welcomeUsernameEl.textContent = username;
  if (profileSubtitleEl) profileSubtitleEl.textContent = username;
};

updateWelcomeUsername();
window.addEventListener('storage', (event) => {
  if (event.key === 'archiware_username' || event.key === 'username' || event.key === 'userName') {
    updateWelcomeUsername();
  }
});

const resetArchiwareSession = () => {
  localStorage.clear();
  const isSetupPage = window.location.pathname.endsWith('/setup.html') || window.location.pathname.includes('/setup/');

  if (isSetupPage) {
    window.location.reload();
  } else {
    window.location.href = '../../setup.html?reset=1';
  }
};

const handleResetShortcut = (event) => {
  const isBacktickKey = event.code === 'Backquote' || event.key === '`' || event.key === '²' || event.key === '~';
  if (!isBacktickKey) return;
  if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;

  event.preventDefault();
  event.stopPropagation();
  resetArchiwareSession();
};

document.addEventListener('keydown', handleResetShortcut);

document.addEventListener('click', (event) => {
  const isInsideNotificationCenter = event.target instanceof Node && notificationCenter.contains(event.target);
  const isInsideNotificationStack = event.target instanceof Node && notificationStack.contains(event.target);
  const isInsideOsLauncherPanel = event.target instanceof Node && osLauncherPanel && osLauncherPanel.contains(event.target);

  if (!isInsideNotificationCenter && !isInsideNotificationStack) {
    closeNotificationCenter();
  }
  if (osLauncherOverlay && osLauncherOverlay.classList.contains('visible') && !isInsideOsLauncherPanel) {
    hideOSLauncherMenu();
  }
});

const renderOSLauncherApps = (filter = '') => {
  if (!osLauncherAppList) return;
  const query = filter.trim().toLowerCase();
  const visibleApps = osLauncherApps.filter((app) => app.label.toLowerCase().includes(query) || app.id.toLowerCase().includes(query));
  osLauncherAppList.innerHTML = '';

  if (!visibleApps.length) {
    osLauncherAppList.innerHTML = '<div class="os-launcher-empty">No apps found.</div>';
    return;
  }

  visibleApps.forEach((app) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'os-launcher-app-item';
    button.dataset.app = app.id;
    button.innerHTML = `
      <span class="os-launcher-app-icon"><img src="${app.icon}" alt="${app.label}" /></span>
      <span>${app.label}</span>
    `;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      launchAppWindow(app.id);
      hideOSLauncherMenu();
    });
    osLauncherAppList.appendChild(button);
  });
};

const hideOSLauncherPowerMenu = () => {
  if (!osLauncherPowerMenu) return;
  osLauncherPowerMenu.classList.remove('visible');
  osLauncherPowerMenu.classList.add('hidden');
  osLauncherPowerMenu.setAttribute('aria-hidden', 'true');
};

const toggleOSLauncherPowerMenu = () => {
  if (!osLauncherPowerMenu) return;
  const isOpen = osLauncherPowerMenu.classList.contains('visible');
  osLauncherPowerMenu.classList.toggle('visible', !isOpen);
  osLauncherPowerMenu.classList.toggle('hidden', isOpen);
  osLauncherPowerMenu.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
};

const showOSLauncherMenu = () => {
  if (!osLauncherOverlay) return;
  osLauncherOverlay.classList.remove('hidden');
  osLauncherOverlay.classList.add('visible');
  osLauncherOverlay.setAttribute('aria-hidden', 'false');
  hideOSLauncherPowerMenu();
  renderOSLauncherApps('');
  if (osLauncherSearch) {
    osLauncherSearch.value = '';
    osLauncherSearch.focus();
  }
};

const hideOSLauncherMenu = () => {
  if (!osLauncherOverlay) return;
  osLauncherOverlay.classList.remove('visible');
  osLauncherOverlay.classList.add('hidden');
  osLauncherOverlay.setAttribute('aria-hidden', 'true');
  hideOSLauncherPowerMenu();
};

const toggleOSLauncherMenu = () => {
  if (!osLauncherOverlay) return;
  if (osLauncherOverlay.classList.contains('visible')) {
    hideOSLauncherMenu();
  } else {
    showOSLauncherMenu();
  }
};

const handleAppShortcuts = (event) => {
  const isAltKey = event.key === 'Alt' || event.code === 'AltLeft' || event.code === 'AltRight';
  if (isAltKey && !event.repeat && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    altKeyState.isPressed = true;
    altKeyState.usedWithOtherKey = false;
    return;
  }

  if (altKeyState.isPressed && !isAltKey) {
    altKeyState.usedWithOtherKey = true;
  }

  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    const key = event.key?.toLowerCase();
    if (key === 'e') {
      event.preventDefault();
      event.stopPropagation();
      launchAppWindow('explorer');
      return;
    }
    if (key === 'i') {
      event.preventDefault();
      event.stopPropagation();
      launchAppWindow('settings');
      return;
    }
    if (key === 'p') {
      event.preventDefault();
      event.stopPropagation();
      launchAppWindow('pluberry');
      return;
    }
  }
};

document.addEventListener('keydown', handleAppShortcuts);

document.addEventListener('keyup', (event) => {
  const isAltKey = event.key === 'Alt' || event.code === 'AltLeft' || event.code === 'AltRight';
  if (isAltKey && altKeyState.isPressed) {
    if (!altKeyState.usedWithOtherKey) {
      event.preventDefault();
      event.stopPropagation();
      toggleOSLauncherMenu();
    }
    altKeyState.isPressed = false;
    altKeyState.usedWithOtherKey = false;
  }
});

const getMinimizeTargetRect = () => {
  if (!minimizedAppsContainer) return null;
  const pill = minimizedAppsContainer.lastElementChild;
  if (pill) return pill.getBoundingClientRect();
  if (profileTrigger) return profileTrigger.getBoundingClientRect();
  return null;
};

const getGenieTransformValues = (windowEl, targetRect) => {
  const windowRect = windowEl.getBoundingClientRect();
  const windowCenterX = windowRect.left + windowRect.width / 2;
  const windowCenterY = windowRect.top + windowRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  return {
    x: targetCenterX - windowCenterX,
    y: targetCenterY - windowCenterY
  };
};

const createMinimizedAppPill = (windowEl) => {
  if (!minimizedAppsContainer || !windowEl) return;
  const windowId = windowEl.id || 'window-1';
  if (minimizedWindows.has(windowId)) return;

  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'minimized-app-pill';
  pill.textContent = windowEl.dataset.appLabel || 'Minimized app';
  pill.dataset.windowId = windowId;

  pill.addEventListener('click', () => {
    restoreMinimizedWindow(windowId);
  });

  minimizedAppsContainer.appendChild(pill);
  minimizedWindows.set(windowId, pill);
};

const restoreMinimizedWindow = (windowId) => {
  const minimizedWindow = document.getElementById(windowId);
  const pill = minimizedWindows.get(windowId);
  if (!minimizedWindow) return;

  const targetRect = getMinimizeTargetRect();
  minimizedWindow.classList.remove('minimized-hidden');
  minimizedWindow.classList.remove('is-minimized');
  minimizedWindow.setAttribute('aria-label', 'Open window');
  minimizedWindow.setAttribute('aria-hidden', 'false');

  if (targetRect) {
    const values = getGenieTransformValues(minimizedWindow, targetRect);
    minimizedWindow.style.setProperty('--genie-translate-x', `${values.x}px`);
    minimizedWindow.style.setProperty('--genie-translate-y', `${values.y}px`);
    minimizedWindow.style.transform = `translate(${values.x}px, ${values.y}px) scale(0.12)`;
    minimizedWindow.style.opacity = '0';
    requestAnimationFrame(() => {
      minimizedWindow.classList.add('genie-restore');
      minimizedWindow.style.opacity = '';
    });

    minimizedWindow.addEventListener('animationend', () => {
      minimizedWindow.classList.remove('genie-restore');
      minimizedWindow.style.transform = '';
      minimizedWindow.style.opacity = '';
    }, { once: true });
  }

  if (pill) {
    pill.remove();
    minimizedWindows.delete(windowId);
    // restore dock state for this window
    const appId = windowId === 'explorerWindow' ? 'explorer' : windowId === 'settingsWindow' ? 'settings' : null;
    if (appId) setDockOpenState(appId, true);
  }
};

const preventPowerContextMenu = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const preventPowerInteractions = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const hidePowerOverlay = () => {
  if (!powerOverlay) return;
  powerOverlay.classList.remove('visible');
  powerOverlay.classList.add('hidden');
  powerOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.cursor = '';
  document.removeEventListener('contextmenu', preventPowerContextMenu, { capture: true });
  document.removeEventListener('mousedown', preventPowerInteractions, { capture: true });
  document.removeEventListener('mouseup', preventPowerInteractions, { capture: true });
};

const showPowerOverlay = () => {
  if (!powerOverlay) return;
  powerOverlay.classList.remove('hidden');
  powerOverlay.classList.add('visible');
  powerOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.cursor = 'none';
  document.addEventListener('contextmenu', preventPowerContextMenu, { capture: true });
  document.addEventListener('mousedown', preventPowerInteractions, { capture: true, passive: false });
  document.addEventListener('mouseup', preventPowerInteractions, { capture: true, passive: false });
};

const runPowerSequence = (mode, options = {}) => {
  const shouldWaitForKey = options.waitForKey === true;
  showPowerOverlay();

  let f2Pressed = false;
  const handlePowerSequenceKey = (event) => {
    if (event.key !== 'F2') return;
    event.preventDefault();
    event.stopPropagation();
    f2Pressed = true;
    document.removeEventListener('keydown', handlePowerSequenceKey);
    window.removeEventListener('keydown', handlePowerSequenceKey);
  };
  document.addEventListener('keydown', handlePowerSequenceKey);
  window.addEventListener('keydown', handlePowerSequenceKey);

  if (powerTitle) {
    powerTitle.textContent = '';
  }

  if (powerLog) {
    powerLog.innerHTML = '';
  }

  const delay = mode === 'shutdown' ? 120 : 140;
  let index = 0;

  const revealNextLine = () => {
    if (!powerLog) {
      return;
    }

    const line = document.createElement('div');
    line.className = 'power-line';

    const content = bootSequenceLines[index];
    if (content.includes('[ OK ]')) {
      const prefix = content.split('[ OK ]')[0];
      const suffix = content.split('[ OK ]')[1] || '';
      line.innerHTML = `${prefix}[ <span style="color:#4ade80">OK</span> ]${suffix}`;
    } else {
      line.textContent = content;
    }

    powerLog.appendChild(line);

    requestAnimationFrame(() => {
      line.classList.add('is-visible');
      if (powerLog) {
        powerLog.scrollTop = powerLog.scrollHeight;
      }
    });

    index += 1;

    if (index < bootSequenceLines.length) {
      setTimeout(revealNextLine, delay);
    } else if (mode === 'shutdown') {
      setTimeout(() => {
        if (powerLog) {
          powerLog.innerHTML = '';
          powerLog.scrollTop = 0;
        }

        document.removeEventListener('keydown', handlePowerSequenceKey);
        window.removeEventListener('keydown', handlePowerSequenceKey);

        if (f2Pressed) {
          hidePowerOverlay();
          window.location.replace(getUefiUrl());
          return;
        }

        if (shouldWaitForKey) {
          const resumeSequence = (event) => {
            if (event.repeat) return;
            document.removeEventListener('keydown', resumeSequence);
            window.removeEventListener('keydown', resumeSequence);
            runPowerSequence('shutdown');
          };
          document.addEventListener('keydown', resumeSequence, { once: true });
        } else {
          setTimeout(() => {
            hidePowerOverlay();
            redirectToLogin();
          }, 5000);
        }
      }, 200);
    } else {
      setTimeout(() => {
        if (powerLog) {
          powerLog.innerHTML = '';
          powerLog.scrollTop = 0;
        }

        document.removeEventListener('keydown', handlePowerSequenceKey);
        window.removeEventListener('keydown', handlePowerSequenceKey);

        if (f2Pressed) {
          hidePowerOverlay();
          redirectToUefiWithDelay(1500);
          return;
        }

        setTimeout(() => {
          hidePowerOverlay();
          redirectToLogin();
        }, 3000);
      }, 200);
    }
  };

  revealNextLine();
};

const shutdown = () => {
  localStorage.setItem('archiware_session_active', 'false');
  runPowerSequence('shutdown', { waitForKey: true });
};

const reboot = () => {
  localStorage.setItem('archiware_session_active', 'false');
  runPowerSequence('reboot');
};

const focusWindow = (windowEl) => {
  if (!windowEl || windowEl.classList.contains('is-closed') || windowEl.classList.contains('is-minimized')) return;
  windowZIndex += 1;
  windowEl.style.zIndex = windowZIndex;
  windows.forEach((win) => win.classList.toggle('focused', win === windowEl));
  // mark corresponding dock item as focused
  const appId = getAppIdForWindow(windowEl.id);
  setDockWindowFocused(appId);
};

// Map dock app open/closed state to visual class
const setDockOpenState = (appId, open) => {
  if (!appId) return;
  const item = document.querySelector(`.dock__item[data-app="${appId}"]`);
  if (!item) return;
  item.classList.toggle('is-open', Boolean(open));
};

// Add temporary hover/focus state on dock items when interacting with windows
const setDockWindowHover = (appId, hover) => {
  if (!appId) return;
  const item = document.querySelector(`.dock__item[data-app="${appId}"]`);
  if (!item) return;
  item.classList.toggle('is-window-hover', Boolean(hover));
};

const setDockWindowFocused = (appId) => {
  dockItems.forEach((it) => it.classList.remove('is-window-focused'));
  if (!appId) return;
  const item = document.querySelector(`.dock__item[data-app="${appId}"]`);
  if (!item) return;
  item.classList.add('is-window-focused');
};

const getAppIdForWindow = (windowId) => {
  const id = String(windowId || '');
  if (id.startsWith('explorerWindow')) return 'explorer';
  if (id.startsWith('settingsWindow')) return 'settings';
  if (id.startsWith('pluberryWindow')) return 'pluberry';
  if (id.startsWith('browserWindow')) return 'browser';
  if (id.startsWith('textEditorWindow')) return 'editor';
  return null;
};

applySavedSettings();


const refreshExplorerWindows = () => {
  const explorerWindows = Array.from(document.querySelectorAll('.window[id^="explorerWindow"]'));
  explorerWindows.forEach((windowEl) => {
    if (windowEl.classList.contains('is-closed')) return;
    renderExplorerWindow(windowEl, window.showContextMenu, openTextEditorWindow);
  });
};

const openFolderInExplorer = (folderName) => {
  const explorerWindow = openExplorerWindow();
  if (!explorerWindow) return;
  const pathSegments = findExplorerNodePathByName(folderName);
  if (pathSegments && pathSegments.length) {
    navigateExplorerWindow(explorerWindow, pathSegments);
    return;
  }
  explorerWindow.dataset.explorerPath = '';
  explorerWindow.dataset.explorerHistory = '[]';
  explorerWindow.dataset.explorerHistoryIndex = '0';
  renderExplorerWindow(explorerWindow, window.showContextMenu, openTextEditorWindow);
};

const createAppWindow = (appId) => {
  const templateId = appId === 'explorer' ? 'explorerWindow' : appId === 'settings' ? 'settingsWindow' : appId === 'editor' ? 'textEditorWindow' : appId === 'pluberry' ? 'pluberryWindow' : appId === 'browser' ? 'browserWindow' : null;
  const template = document.getElementById(templateId);
  if (!template) return null;

  const clone = template.cloneNode(true);
  const instanceId = `${templateId}-${(appWindowCounters[appId] || 0) + 1}`;
  appWindowCounters[appId] = (appWindowCounters[appId] || 0) + 1;
  clone.id = instanceId;
  clone.classList.remove('is-closed', 'is-minimized', 'minimized-hidden');
  clone.setAttribute('aria-hidden', 'false');
  clone.setAttribute('aria-label', appId === 'explorer' ? 'Explorer' : appId === 'settings' ? 'Settings' : appId === 'editor' ? 'Text Editor' : appId === 'pluberry' ? 'Pluberry' : appId === 'browser' ? 'Browser' : '');
  clone.dataset.appLabel = appId === 'explorer' ? 'Explorer' : appId === 'settings' ? 'Settings' : appId === 'editor' ? 'Text Editor' : appId === 'pluberry' ? 'Pluberry' : appId === 'browser' ? 'Browser' : '';
  clone.style.width = '900px';
  clone.style.height = '560px';
  const position = getNextWindowPosition(900, 560);
  clone.style.left = `${position.x}px`;
  clone.style.top = `${position.y}px`;
  document.querySelector('.desktop')?.appendChild(clone);

  const createResizeHandle = (targetWindow) => {
    if (targetWindow.id === 'mainWindow' || targetWindow.querySelector('.window__resize-handle')) return null;
    const handle = document.createElement('div');
    handle.className = 'window__resize-handle';
    handle.setAttribute('aria-hidden', 'true');
    targetWindow.appendChild(handle);
    return handle;
  };

  createResizeHandle(clone);
  bindWindowInteractions(clone);
  if (appId === 'explorer') initExplorerWindow(clone, window.showContextMenu, openTextEditorWindow);
  if (appId === 'settings') initSettingsWindow(clone);
  if (appId === 'editor') initTextEditorWindow(clone, findExplorerNodeById, refreshExplorerWindows, createNewTextFileOnDesktop);
  if (appId === 'pluberry') initPluberryWindow(clone);
  if (appId === 'browser') initBrowserWindow(clone);
  windows = document.querySelectorAll('.window');
  focusWindow(clone);
  setDockOpenState(appId, true);
  refreshRunningDockApps();
  enforceMemoryLimit();
  return clone;
};

const openExplorerWindow = () => createAppWindow('explorer');

const openSettingsWindow = () => createAppWindow('settings');
const openPluberryWindow = () => createAppWindow('pluberry');
const openBrowserWindow = (url = '') => {
  const win = createAppWindow('browser');
  if (!win) return null;
  if (url) {
    const webview = win.querySelector('.browser-webview');
    const urlBar = win.querySelector('.browser-url-bar');
    if (webview) webview.src = url;
    if (urlBar) urlBar.textContent = url;
  }
  return win;
};

const isTextFileName = (fileName = '') => {
  const name = String(fileName).trim().toLowerCase();
  return name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown');
};

const createNewTextFileOnDesktop = () => {
  const desktopNode = getExplorerDesktopNode();
  if (!desktopNode || desktopNode.type !== 'folder') return null;
  const name = buildUniqueExplorerItemName(desktopNode, 'New File.txt');
  const fileNode = {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    name,
    type: 'file',
    icon: '📄',
    content: ''
  };
  desktopNode.children.push(fileNode);
  if (typeof window.createDesktopFileElement === 'function') {
    window.createDesktopFileElement(fileNode);
  }
  return fileNode;
};

const openTextEditorWindow = (fileNode) => {
  let targetNode = fileNode;
  if (!targetNode || !isTextFileName(targetNode.name)) {
    targetNode = createNewTextFileOnDesktop();
  }

  const win = createAppWindow('editor');
  if (!win || !targetNode) return null;

  win.dataset.editorFileId = targetNode.id;
  const title = win.querySelector('.finder-title');
  if (title) title.textContent = targetNode.name || 'Untitled';
  const path = win.querySelector('.editor-path');
  if (path) path.textContent = `${targetNode.name}`;
  const area = win.querySelector('.text-editor');
  if (area) area.value = targetNode.content || '';
  return win;
};


const launchAppWindow = (appId) => {
  if (!appId) return null;
  if (appId === 'music') return launchUnavailableApp('Music');
  const win = appId === 'explorer'
    ? openExplorerWindow()
    : appId === 'settings'
      ? openSettingsWindow()
      : appId === 'pluberry'
        ? openPluberryWindow()
        : appId === 'browser'
          ? openBrowserWindow()
          : appId === 'editor'
            ? openTextEditorWindow()
            : null;
  if (win) focusWindow(win);
  return win;
};

const closeAllWindowsForApp = (appId) => {
  windows.forEach((win) => {
    const winAppId = getAppIdForWindow(win.id);
    if (winAppId !== appId) return;
    if (win.classList.contains('is-closed')) return;
    const closeBtn = win.querySelector('.window__control--close');
    if (closeBtn) closeBtn.click();
  });
};

const hasOpenWindowsForApp = (appId) => {
  return Array.from(windows).some((win) => {
    const winAppId = getAppIdForWindow(win.id);
    return winAppId === appId && !win.classList.contains('is-closed') && !win.classList.contains('is-minimized');
  });
};

const getDockMenuItems = (appId) => {
  if (!appId) return [];
  return [
    { label: 'Open', action: () => launchAppWindow(appId) },
    { label: 'Open on a new window', action: () => launchAppWindow(appId) },
    { type: 'divider' },
    { label: 'Close all', action: () => closeAllWindowsForApp(appId) }
  ];
};
// Use elementFromPoint to determine the topmost visible window under the pointer
const getTopWindowAtPoint = (x, y) => {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const win = el.closest('.window');
  if (!win) return null;
  if (win.classList.contains('is-closed') || win.classList.contains('is-minimized')) return null;
  return win;
};

let __lastDockHoverApp = null;
const updateDockHoverFromPoint = (x, y) => {
  const win = getTopWindowAtPoint(x, y);
  const appId = win ? getAppIdForWindow(win.id) : null;
  if (appId === __lastDockHoverApp) return;
  if (__lastDockHoverApp) setDockWindowHover(__lastDockHoverApp, false);
  if (appId) setDockWindowHover(appId, true);
  __lastDockHoverApp = appId;
};

document.addEventListener('pointermove', (e) => {
  updateDockHoverFromPoint(e.clientX, e.clientY);
});

document.addEventListener('pointerleave', () => {
  if (__lastDockHoverApp) {
    setDockWindowHover(__lastDockHoverApp, false);
    __lastDockHoverApp = null;
  }
});

// Open Finder from the workspace app card
const openFilesApp = document.getElementById('openFilesApp');
if (openFilesApp) {
  openFilesApp.addEventListener('click', (e) => {
    e.preventDefault();
    openExplorerWindow();
  });
  openFilesApp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') openFilesApp.click();
  });
}

if (quickFilesBtn) {
  quickFilesBtn.addEventListener('click', (event) => {
    event.preventDefault();
    openExplorerWindow();
    if (profilePopup) {
      profilePopup.classList.remove('visible');
      profilePopup.classList.add('hidden');
      profilePopup.setAttribute('aria-hidden', 'true');
    }
  });
}
// Multi-window dragging: attach pointer handlers to each window header
let currentDrag = null;
let currentResize = null;
const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 240;

const startResizingWindow = (win, event) => {
  if (win.id === 'mainWindow' || win.classList.contains('is-fullscreen')) return;
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();

  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = win.offsetWidth;
  const startHeight = win.offsetHeight;

  window.__resizeState = { started: true, winId: win.id };

  currentResize = {
    win,
    startX,
    startY,
    startWidth,
    startHeight
  };

  win.classList.add('is-resizing');
  win.style.transition = 'none';
  document.body.style.cursor = 'nwse-resize';

  const handleResize = (moveEvent) => {
    if (!currentResize) return;

    const { win: activeWin, startX: baseX, startY: baseY, startWidth: baseWidth, startHeight: baseHeight } = currentResize;
    const desktopEl = document.querySelector('.desktop');
    if (!desktopEl) return;

    const desktopWidth = desktopEl.clientWidth;
    const desktopHeight = desktopEl.clientHeight;
    const deltaX = moveEvent.clientX - baseX;
    const deltaY = moveEvent.clientY - baseY;
    const maxWidth = Math.max(MIN_WINDOW_WIDTH, desktopWidth - activeWin.offsetLeft - 24);
    const maxHeight = Math.max(MIN_WINDOW_HEIGHT, desktopHeight - activeWin.offsetTop - 24);

    const newWidth = Math.min(Math.max(MIN_WINDOW_WIDTH, baseWidth + deltaX), maxWidth);
    const newHeight = Math.min(Math.max(MIN_WINDOW_HEIGHT, baseHeight + deltaY), maxHeight);

    activeWin.style.width = `${newWidth}px`;
    activeWin.style.height = `${newHeight}px`;
  };

  const stopResize = () => {
    if (!currentResize) return;

    const { win: activeWin } = currentResize;
    currentResize = null;
    activeWin.classList.remove('is-resizing');
    activeWin.style.transition = '';
    document.body.style.cursor = '';

    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
};

const addWindowResizeHandles = () => {
  windows.forEach((win) => {
    if (win.id === 'mainWindow' || win.querySelector('.window__resize-handle')) return;

    const handle = document.createElement('div');
    handle.className = 'window__resize-handle';
    handle.setAttribute('aria-hidden', 'true');
    win.appendChild(handle);
  });
};

const handleResizeGripMouseDown = (event) => {
  const handle = event.target.closest('.window__resize-handle');
  if (!handle) return;
  const win = handle.closest('.window');
  if (!win || win.id === 'mainWindow' || win.classList.contains('is-fullscreen')) return;
  if (event.button !== 0) return;
  startResizingWindow(win, event);
};

document.addEventListener('mousedown', handleResizeGripMouseDown);

const startDraggingWindow = (win, event) => {
  // Don't initiate dragging when interacting with form controls or buttons
  if (event.target.closest('button, input, textarea, select, [contenteditable]')) return;
  if (win.classList.contains('is-fullscreen')) return;
  event.preventDefault();

  currentDrag = {
    win,
    startX: event.clientX,
    startY: event.clientY,
    startLeft: win.offsetLeft,
    startTop: win.offsetTop,
    pointerId: event.pointerId
  };

  win.classList.add('is-dragging');
  win.style.transition = 'none';
  try { win.setPointerCapture(event.pointerId); } catch (e) {}
};

const updateDraggingWindow = (event) => {
  if (!currentDrag) return;
  const { win, startX, startY, startLeft, startTop } = currentDrag;
  const desktopEl = document.querySelector('.desktop');
  if (!desktopEl) return;
  const desktopWidth = desktopEl.clientWidth;
  const desktopHeight = desktopEl.clientHeight;
  const maxLeft = Math.max(0, desktopWidth - win.offsetWidth);
  const maxTop = Math.max(0, desktopHeight - win.offsetHeight);
  const nextLeft = Math.min(maxLeft, Math.max(0, startLeft + event.clientX - startX));
  const nextTop = startTop + event.clientY - startY;

  const isActiveWindow = document.activeElement === win || win.classList.contains('is-dragging');
  const shouldHideDock = isActiveWindow && (
    nextTop + win.offsetHeight >= desktopHeight - 96 ||
    (nextTop + win.offsetHeight >= desktopHeight - 170 && nextLeft + win.offsetWidth > desktopWidth - 220)
  );
  const shouldHideTopbar = isActiveWindow && nextTop <= 72;

  win.style.left = `${nextLeft}px`;
  win.style.top = `${Math.max(0, Math.min(nextTop, maxTop))}px`;

  if (topbar && dock) {
    topbar.classList.toggle('is-hiding', shouldHideTopbar);
    dock.classList.toggle('is-hiding', shouldHideDock);
  }
};

const stopDraggingWindow = (event) => {
  if (!currentDrag) return;
  const { win } = currentDrag;
  currentDrag = null;
  win.classList.remove('is-dragging');
  win.style.transition = '';
  if (topbar) topbar.classList.remove('is-hiding');
  if (dock) dock.classList.remove('is-hiding');
  if (event?.pointerId !== undefined) {
    try { win.releasePointerCapture(event.pointerId); } catch (e) {}
  }
};

const bindWindowInteractions = (win) => {
  const header = win.querySelector('.window__header');
  if (header) {
    header.addEventListener('pointerdown', (e) => {
      focusWindow(win);
      startDraggingWindow(win, e);
    });
  }

  win.addEventListener('mousedown', () => focusWindow(win));

  const appId = getAppIdForWindow(win.id);
  if (appId) {
    win.addEventListener('pointerenter', () => setDockWindowHover(appId, true));
    win.addEventListener('pointerleave', () => setDockWindowHover(appId, false));
  }

  const closeBtn = win.querySelector('.window__control--close');
  const minBtn = win.querySelector('.window__control--minimize');
  const existingHandle = win.querySelector('.window__resize-handle');
  if (win.id !== 'mainWindow' && !existingHandle) {
    const handle = document.createElement('div');
    handle.className = 'window__resize-handle';
    handle.setAttribute('aria-hidden', 'true');
    win.appendChild(handle);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      win.classList.add('is-closed');
      const currentAppId = getAppIdForWindow(win.id);
      if (currentAppId) {
        dockItems.forEach((dockItem) => {
          if (dockItem.dataset.app === currentAppId) {
            dockItem.classList.remove('is-active');
            dockItem.classList.remove('is-window-hover', 'is-window-focused');
          }
        });
        setDockOpenState(currentAppId, hasOpenWindowsForApp(currentAppId));
        refreshRunningDockApps();
      }
    });
  }

  if (minBtn) {
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!win.classList.contains('is-minimized')) {
        const targetRect = getMinimizeTargetRect();
        createMinimizedAppPill(win);
        const currentAppId = getAppIdForWindow(win.id);
        if (currentAppId) {
          setDockOpenState(currentAppId, hasOpenWindowsForApp(currentAppId));
          refreshRunningDockApps();
          const dockItem = document.querySelector(`.dock__item[data-app="${currentAppId}"]`);
          if (dockItem) dockItem.classList.remove('is-window-hover', 'is-window-focused');
        }
        if (targetRect) {
          const values = getGenieTransformValues(win, targetRect);
          win.style.setProperty('--genie-translate-x', `${values.x}px`);
          win.style.setProperty('--genie-translate-y', `${values.y}px`);
          win.classList.add('genie-minimize');
          win.addEventListener('animationend', () => {
            win.classList.remove('genie-minimize');
            win.classList.add('is-minimized', 'minimized-hidden');
            win.setAttribute('aria-hidden', 'true');
            win.style.transform = '';
          }, { once: true });
        } else {
          win.classList.add('is-minimized', 'minimized-hidden');
          win.setAttribute('aria-hidden', 'true');
        }
      }
    });
  }

  // Add context menu for window control (Close / Minimize)
  win.addEventListener('contextmenu', (e) => {
    if (!e.target) return;
    e.preventDefault();
    e.stopPropagation();
    const closeBtn = win.querySelector('.window__control--close');
    const minBtn = win.querySelector('.window__control--minimize');
    const items = [
      { label: 'Close', action: () => { if (closeBtn) closeBtn.click(); } },
      { label: 'Minimize', action: () => { if (minBtn) minBtn.click(); } }
    ];
    showContextMenu(e.clientX, e.clientY, items);
  });
};

Array.from(windows).forEach((win) => bindWindowInteractions(win));
addWindowResizeHandles();

const desktopRoot = document.querySelector('.desktop');
if (desktopRoot) {
  const memoryObserver = new MutationObserver(() => {
    enforceMemoryLimit();
  });
  memoryObserver.observe(desktopRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

document.addEventListener('pointermove', (event) => {
  updateDraggingWindow(event);
});
document.addEventListener('pointerup', (event) => {
  stopDraggingWindow(event);
});
document.addEventListener('pointercancel', (event) => {
  stopDraggingWindow(event);
});


if (profileTrigger) {
  profileTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleProfile();
    if (calendarPopup) hideCalendar();
  });
}

if (powerOffBtn) {
  powerOffBtn.addEventListener('click', () => {
    hideCalendar();
    if (profilePopup) {
      profilePopup.classList.remove('visible');
      profilePopup.classList.add('hidden');
      profilePopup.setAttribute('aria-hidden', 'true');
    }
    shutdown();
  });
}

if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    hideCalendar();
    if (profilePopup) {
      profilePopup.classList.remove('visible');
      profilePopup.classList.add('hidden');
      profilePopup.setAttribute('aria-hidden', 'true');
    }
    reboot();
  });
}

const logOutBtn = document.getElementById('quickLogOutBtn');

if (logOutBtn) {
  logOutBtn.addEventListener('click', () => {
    hideCalendar();
    if (profilePopup) {
      profilePopup.classList.remove('visible');
      profilePopup.classList.add('hidden');
      profilePopup.setAttribute('aria-hidden', 'true');
    }
    localStorage.setItem('archiware_session_active', 'false');
    redirectToLogin('./login/');
  });
}

if (clock) {
  clock.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCalendar();
    if (profilePopup) {
      profilePopup.classList.remove('visible');
      profilePopup.classList.add('hidden');
      profilePopup.setAttribute('aria-hidden', 'true');
    }
  });
}

if (shortcutToggleBtn && shortcutDropdown) {
  shortcutToggleBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const isVisible = shortcutDropdown.classList.contains('visible');
    shortcutDropdown.classList.toggle('visible', !isVisible);
    shortcutDropdown.classList.toggle('hidden', isVisible);
  });
}

if (osLauncherPowerBtn) {
  osLauncherPowerBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleOSLauncherPowerMenu();
  });
}

if (osLauncherPowerMenu) {
  osLauncherPowerMenu.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const powerAction = target.dataset.power;
    if (!powerAction) return;
    event.stopPropagation();
    hideOSLauncherMenu();
    if (powerAction === 'shutdown') shutdown();
    if (powerAction === 'restart') reboot();
  });
}

if (osLauncherSearch) {
  osLauncherSearch.addEventListener('input', (event) => {
    renderOSLauncherApps(event.target.value || '');
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideOSLauncherMenu();
    hideOSLauncherPowerMenu();
  }
});

document.addEventListener('click', (event) => {
  if (profilePopup && profilePopup.contains(event.target)) return;
  if (clock && clock.contains(event.target)) return;
  if (calendarPopup && calendarPopup.contains(event.target)) return;
  if (shortcutDropdown && shortcutDropdown.contains(event.target)) return;
  if (profileTrigger && profileTrigger.contains(event.target)) return;
  if (calendarPopup) hideCalendar();
  if (profilePopup) {
    profilePopup.classList.remove('visible');
    profilePopup.classList.add('hidden');
    profilePopup.setAttribute('aria-hidden', 'true');
  }
  if (shortcutDropdown) {
    shortcutDropdown.classList.remove('visible');
    shortcutDropdown.classList.add('hidden');
  }
});

// --------------------- Marquee selection (desktop) ---------------------
(() => {
  const desktopEl = document.querySelector('.desktop');
  if (!desktopEl) return;

  const desktopSurfaceEl = desktopEl.querySelector('.desktop__content') || desktopEl;

  // Create context menu element
  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.style.display = 'none';
  document.body.appendChild(contextMenu);

  const buildContextMenu = (items) => {
    contextMenu.innerHTML = '';
    items.forEach((it) => {
      if (it.type === 'divider') {
        const d = document.createElement('div');
        d.className = 'context-menu__divider';
        contextMenu.appendChild(d);
        return;
      }
      const el = document.createElement('div');
      el.className = 'context-menu__item';
      if (it.disabled) el.classList.add('disabled');
      el.textContent = it.label;
      if (it.shortcut) {
        const span = document.createElement('span');
        span.style.opacity = '0.7';
        span.textContent = it.shortcut;
        el.appendChild(span);
      }
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (it.disabled) return;
        hideContextMenu();
        if (typeof it.action === 'function') it.action();
      });
      contextMenu.appendChild(el);
    });
  };

  const hideContextMenu = () => {
    contextMenu.style.display = 'none';
    contextMenu.innerHTML = '';
  };

  const showContextMenu = (x, y, items) => {
    buildContextMenu(items);
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'block';
    // keep on screen
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) contextMenu.style.left = `${Math.max(8, x - rect.width)}px`;
    if (rect.bottom > window.innerHeight) contextMenu.style.top = `${Math.max(8, y - rect.height)}px`;
  };

  window.showContextMenu = showContextMenu;
  window.hideContextMenu = hideContextMenu;

  dockItems.forEach((item) => {
    item.addEventListener('click', (event) => {
      const action = item.dataset.menu;
      const app = item.dataset.app;
      if (action === 'osLauncher') {
        event.preventDefault();
        event.stopPropagation();
        toggleOSLauncherMenu();
        return;
      }
      if (!app) return;

      event.preventDefault();
      event.stopPropagation();
      launchAppWindow(app);
    });

    item.addEventListener('contextmenu', (event) => {
      const app = item.dataset.app;
      if (!app) return;

      event.preventDefault();
      event.stopPropagation();
      showContextMenu(event.clientX, event.clientY, getDockMenuItems(app));
    });
  });

  // Utility actions
  const actionRefresh = () => window.location.reload();

  const deleteSelectedFolders = () => {
    const selectedItems = Array.from(document.querySelectorAll('.desktop-item.is-selected'));
    selectedItems.forEach((itemEl) => {
      removeDesktopExplorerEntry(itemEl);
      itemEl.remove();
    });
    clearDesktopSelection();
    refreshExplorerWindows();
  };

  const openSelectedFolders = () => {
    const selectedItems = Array.from(document.querySelectorAll('.desktop-item.is-selected'));
    selectedItems.forEach((itemEl) => {
      if (itemEl.classList.contains('desktop-folder')) {
        const name = itemEl.dataset.folderName || itemEl.querySelector('.desktop-folder__name')?.textContent?.trim() || 'New Folder';
        openFolderInExplorer(name);
      } else if (itemEl.classList.contains('desktop-file')) {
        const node = findExplorerNodeById(itemEl.dataset.explorerNodeId);
        if (node) openTextEditorWindow(node);
      }
    });
  };

  const renameSelectedFolders = () => {
    const selectedItems = Array.from(document.querySelectorAll('.desktop-item.is-selected'));
    if (selectedItems.length === 0) return;
    const firstItem = selectedItems[0];
    showRenamePanel(firstItem);
    selectedItems.slice(1).forEach((itemEl) => itemEl.classList.remove('is-selected'));
  };

  let renameTargetEl = null;

  const getFolderName = (targetEl) => targetEl?.dataset.folderName || targetEl?.dataset.fileName || targetEl?.querySelector('.desktop-folder__name, .desktop-file__name')?.textContent?.trim() || 'Item';

  const buildUniqueDesktopItemName = (baseName, targetEl = null) => {
    const trimmedBase = String(baseName || '').trim();
    const isFile = targetEl?.classList.contains('desktop-file');
    const existingNames = getExistingFolderNames(targetEl).map((name) => name.toLowerCase());

    const getFileNameWithSuffix = (name, suffix) => {
      const lastDotIndex = name.lastIndexOf('.');
      if (lastDotIndex > 0 && lastDotIndex < name.length - 1) {
        return `${name.slice(0, lastDotIndex)} ${suffix}${name.slice(lastDotIndex)}`;
      }
      return `${name} ${suffix}`;
    };

    let candidate = trimmedBase || (isFile ? 'New File.txt' : 'Untitled Folder');
    let extension = '';

    if (isFile) {
      const currentName = getFolderName(targetEl);
      if (currentName && currentName.includes('.')) {
        extension = currentName.slice(currentName.lastIndexOf('.'));
      }

      if (candidate.includes('.')) {
        extension = candidate.slice(candidate.lastIndexOf('.'));
      }

      if (!candidate.includes('.') && extension) {
        candidate = `${candidate}${extension}`;
      }
      if (!candidate.includes('.') && !extension) {
        candidate = `${candidate}.txt`;
      }
    }

    if (!existingNames.includes(candidate.toLowerCase())) return candidate;

    let suffix = 2;
    let suffixedName = getFileNameWithSuffix(candidate, suffix);
    while (existingNames.includes(suffixedName.toLowerCase())) {
      suffix += 1;
      suffixedName = getFileNameWithSuffix(candidate, suffix);
    }
    return suffixedName;
  };

  const getExistingFolderNames = (currentEl = null) => {
    const currentName = currentEl ? getFolderName(currentEl) : '';
    return Array.from(document.querySelectorAll('.desktop-item'))
      .map((itemEl) => getFolderName(itemEl))
      .filter((name) => Boolean(name) && name !== currentName);
  };

  const updateDesktopExplorerEntry = (targetEl, finalName) => {
    const nodeId = targetEl?.dataset?.explorerNodeId;
    if (!nodeId) return;
    const node = findExplorerNodeById(nodeId);
    if (node) node.name = finalName;
  };

  const removeDesktopExplorerEntry = (targetEl) => {
    const nodeId = targetEl?.dataset?.explorerNodeId;
    if (!nodeId) return;
    const desktopNode = getExplorerDesktopNode();
    if (!desktopNode) return;
    desktopNode.children = desktopNode.children.filter((entry) => entry.id !== nodeId);
  };

  const buildUniqueFolderName = (baseName, currentEl = null) => {
    const trimmedBase = (baseName || 'Untitled Folder').trim() || 'Untitled Folder';
    const existingNames = getExistingFolderNames(currentEl).map((name) => name.toLowerCase());
    const candidate = trimmedBase;

    if (!existingNames.includes(candidate.toLowerCase())) return candidate;

    let suffix = 2;
    while (existingNames.includes(`${candidate} ${suffix}`.toLowerCase())) {
      suffix += 1;
    }
    return `${candidate} ${suffix}`;
  };

  const ensureRenameInput = (targetEl) => {
    let input = targetEl.querySelector('.desktop-folder__rename-input');
    if (!input) {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'desktop-folder__rename-input';
      input.maxLength = 24;
      input.setAttribute('aria-label', 'Rename folder');
      input.__renameHasCommitted = false;
      targetEl.appendChild(input);
      const commitRename = () => {
        if (input.__renameHasCommitted || !targetEl.classList.contains('is-renaming')) return;
        input.__renameHasCommitted = true;
        const cleanName = input.value.trim();
        const labelEl = targetEl.querySelector('.desktop-folder__name, .desktop-file__name');
        if (!cleanName) {
          if (labelEl) labelEl.style.display = 'block';
          targetEl.classList.remove('is-renaming');
          input.style.display = 'none';
          return;
        }
        const finalName = buildUniqueDesktopItemName(cleanName, targetEl);
        if (labelEl) {
          labelEl.textContent = finalName;
          labelEl.style.display = 'block';
        }
        if (targetEl.classList.contains('desktop-file')) {
          targetEl.dataset.fileName = finalName;
        } else {
          targetEl.dataset.folderName = finalName;
        }
        updateDesktopExplorerEntry(targetEl, finalName);
        targetEl.setAttribute('aria-label', finalName);
        targetEl.classList.remove('is-renaming');
        input.style.display = 'none';
      };

      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          ev.stopPropagation();
          commitRename();
          input.blur();
          return;
        }
        if (ev.key === 'Escape') {
          ev.preventDefault();
          ev.stopPropagation();
          const labelEl = targetEl.querySelector('.desktop-folder__name, .desktop-file__name');
          if (labelEl) labelEl.style.display = 'block';
          targetEl.classList.remove('is-renaming');
          input.style.display = 'none';
        }
      });
      input.addEventListener('blur', () => {
        commitRename();
      });
    }
    return input;
  };

  const hideRenamePanel = () => {
    if (!renameTargetEl) return;
    const input = renameTargetEl.querySelector('.desktop-folder__rename-input');
    const labelEl = renameTargetEl.querySelector('.desktop-folder__name, .desktop-file__name');
    if (input) input.style.display = 'none';
    if (labelEl) labelEl.style.display = 'block';
    renameTargetEl.classList.remove('is-renaming');
    renameTargetEl = null;
  };

  const showRenamePanel = (targetEl) => {
    if (!targetEl) return;
    if (renameTargetEl && renameTargetEl !== targetEl) {
      hideRenamePanel();
    }
    const currentName = getFolderName(targetEl);
    const input = ensureRenameInput(targetEl);
    input.__renameHasCommitted = false;
    input.value = currentName;
    targetEl.classList.add('is-renaming');
    requestAnimationFrame(() => {
      const labelEl = targetEl.querySelector('.desktop-folder__name, .desktop-file__name');
      if (labelEl) {
        labelEl.style.display = 'none';
      }
      input.style.display = 'block';
      input.focus();
      input.select();
    });
    renameTargetEl = targetEl;
  };

  const renameDesktopItem = (targetEl) => {
    if (!targetEl) return;
    showRenamePanel(targetEl);
  };

  let folderCounter = 1;
  const createDesktopFolderElement = (name, { explorerNodeId = null } = {}) => {
    const desktopArea = document.querySelector('.desktop__content');
    if (!desktopArea) return null;
    let container = document.querySelector('.desktop-folders');
    if (!container) {
      container = document.createElement('div');
      container.className = 'desktop-folders';
      desktopArea.appendChild(container);
    }

    const folder = document.createElement('div');
    folder.className = 'desktop-item desktop-folder';
    const resolvedName = buildUniqueFolderName(name || `New Folder ${folderCounter}`);
    const desktopNode = getExplorerDesktopNode();

    if (explorerNodeId) {
      const explorerNode = findExplorerNodeById(explorerNodeId);
      if (explorerNode) {
        folder.dataset.explorerNodeId = explorerNode.id;
        folder.dataset.folderName = explorerNode.name;
      }
    } else {
      const explorerEntry = desktopNode ? {
        id: `desktop-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: resolvedName,
        type: 'folder',
        children: []
      } : null;

      if (explorerEntry) {
        desktopNode.children.push(explorerEntry);
        folder.dataset.explorerNodeId = explorerEntry.id;
      }
    }

    const displayName = folder.dataset.folderName || resolvedName;
    folder.dataset.folderName = displayName;
    folder.setAttribute('role', 'button');
    folder.setAttribute('tabindex', '0');
    folder.setAttribute('aria-label', displayName);

    const icon = document.createElement('div');
    icon.className = 'desktop-folder__icon';
    icon.innerHTML = '<img src="../public/icons/explorer.svg" alt="Explorer" />';

    const label = document.createElement('div');
    label.className = 'desktop-folder__name';
    label.textContent = displayName;

    folder.appendChild(icon);
    folder.appendChild(label);
    container.appendChild(folder);

    folder.addEventListener('click', (event) => {
      if (event.target.closest('.desktop-folder__rename-input') || folder.classList.contains('is-renaming')) return;
      const currentName = folder.dataset.folderName || folder.querySelector('.desktop-folder__name')?.textContent?.trim() || 'New Folder';
      openFolderInExplorer(currentName);
    });
    folder.addEventListener('keydown', (event) => {
      if (event.target.closest('.desktop-folder__rename-input') || folder.classList.contains('is-renaming')) {
        event.stopPropagation();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const currentName = folder.dataset.folderName || folder.querySelector('.desktop-folder__name')?.textContent?.trim() || 'New Folder';
        openFolderInExplorer(currentName);
      }
    });

    const explorerWindows = document.querySelectorAll('.window[id^="explorerWindow"]');
    explorerWindows.forEach((explorerWindow) => {
      if (explorerWindow.classList.contains('is-closed')) return;
      const currentPath = explorerWindow.dataset.explorerPath || '';
      if (!currentPath) {
        renderExplorerWindow(explorerWindow, window.showContextMenu, openTextEditorWindow);
        return;
      }
      const segments = currentPath.split('/').filter(Boolean);
      if (segments[0] === 'desktop') {
        renderExplorerWindow(explorerWindow, window.showContextMenu, openTextEditorWindow);
      }
    });

    return folder;
  };

  const createDesktopFileElement = (fileEntry) => {
    if (!fileEntry || fileEntry.type !== 'file') return null;
    const desktopArea = document.querySelector('.desktop__content');
    if (!desktopArea) return null;
    let container = document.querySelector('.desktop-folders');
    if (!container) {
      container = document.createElement('div');
      container.className = 'desktop-folders';
      desktopArea.appendChild(container);
    }

    const fileItem = document.createElement('div');
    fileItem.className = 'desktop-item desktop-file';
    fileItem.dataset.explorerNodeId = fileEntry.id;
    fileItem.dataset.fileName = fileEntry.name;
    fileItem.setAttribute('role', 'button');
    fileItem.setAttribute('tabindex', '0');
    fileItem.setAttribute('aria-label', fileEntry.name);

    const icon = document.createElement('div');
    icon.className = 'desktop-file__icon desktop-file__icon--svg';
    const isTextOrPdfFile = fileEntry.type === 'file' && /\.(txt|md|markdown|pdf)$/i.test(fileEntry.name || '');
    icon.innerHTML = isTextOrPdfFile
      ? '<img src="../public/icons/text.svg" alt="Document file" />'
      : `
        <div class="desktop-file__mark">${String(fileEntry.name || '').split('.').pop().toUpperCase()}</div>
        <div class="desktop-file__detail-line desktop-file__detail-line--short"></div>
        <div class="desktop-file__detail-line desktop-file__detail-line--long"></div>
      `;

    const label = document.createElement('div');
    label.className = 'desktop-file__name';
    label.textContent = fileEntry.name;

    fileItem.appendChild(icon);
    fileItem.appendChild(label);
    container.appendChild(fileItem);

    fileItem.addEventListener('click', (event) => {
      if (!event.target || event.target.closest('.desktop-folder__rename-input')) return;
      if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
        clearDesktopSelection();
      }
      fileItem.classList.add('is-selected');
      event.preventDefault();
    });

    fileItem.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const node = findExplorerNodeById(fileEntry.id);
        if (node) openTextEditorWindow(node);
      }
    });

    fileItem.addEventListener('dblclick', (event) => {
      event.preventDefault();
      const node = findExplorerNodeById(fileEntry.id);
      if (node) openTextEditorWindow(node);
    });

    return fileItem;
  };

  window.createDesktopFileElement = createDesktopFileElement;

  const actionNewFolder = () => {
    const folder = createDesktopFolderElement(`New Folder ${folderCounter}`);
    if (folder) folderCounter += 1;
  };

  const desktopNode = getExplorerDesktopNode();
  if (desktopNode && Array.isArray(desktopNode.children)) {
    desktopNode.children.forEach((entry) => {
      if (entry.type === 'file') {
        createDesktopFileElement(entry);
      }
    });
  }

  const actionShowDesktop = () => {
    const allWindows = document.querySelectorAll('.window');
    allWindows.forEach((w) => {
      if (!w.classList.contains('is-minimized') && !w.classList.contains('is-closed')) {
        // call minimize behavior
        const btn = w.querySelector('.window__control--minimize');
        if (btn) btn.click();
      }
    });
  };

  const actionPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // create a file-like card with clipboard text
        const el = document.createElement('div');
        el.className = 'file-card';
        el.innerHTML = `<div class="file-icon">📄</div><div class="file-name">${text.slice(0,24)}${text.length>24?'...':''}</div>`;
        const main = document.querySelector('.finder-main') || document.querySelector('.desktop__content');
        if (main) main.appendChild(el);
      }
    } catch (e) {
      // ignore
    }
  };

  requestAnimationFrame(() => {
    createDesktopFolderElement('Projects', { explorerNodeId: 'projects' });
  });

  // Build default desktop context menu
  const defaultMenuItems = [
    { label: 'New Folder', action: actionNewFolder },
    { type: 'divider' },
    { label: 'Show Desktop', action: actionShowDesktop },
    { type: 'divider' },
    { label: 'Get Info', disabled: true },
  ];

  // Show context menu on desktop area right-click
  desktopEl.addEventListener('contextmenu', (e) => {
    if (!e.target) return;
    // prevent on windows/dock/topbar
    if (isSelectionBlockedTarget(e.target)) return;

    const targetItem = e.target.closest('.desktop-item');
    const selectedItems = Array.from(document.querySelectorAll('.desktop-item.is-selected'));
    if (targetItem && (selectedItems.includes(targetItem) || selectedItems.length > 0)) {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: selectedItems.length > 1 ? 'Open All' : 'Open', action: openSelectedFolders },
        { label: selectedItems.length > 1 ? 'Rename All' : 'Rename', action: renameSelectedFolders },
        { type: 'divider' },
        { label: 'Delete', action: deleteSelectedFolders },
        { type: 'divider' },
        { label: 'Get Info', disabled: true }
      ]);
      return;
    }

    if (targetItem) {
      e.preventDefault();
      const openAction = () => {
        if (targetItem.classList.contains('desktop-folder')) {
          openFolderInExplorer(targetItem.dataset.folderName || 'New Folder');
        } else if (targetItem.classList.contains('desktop-file')) {
          const node = findExplorerNodeById(targetItem.dataset.explorerNodeId);
          if (node) openTextEditorWindow(node);
        }
      };
      showContextMenu(e.clientX, e.clientY, [
        { label: 'Rename', action: () => renameDesktopItem(targetItem) },
        { type: 'divider' },
        { label: 'Open', action: openAction },
        { type: 'divider' },
        { label: 'Delete', action: () => {
          removeDesktopExplorerEntry(targetItem);
          targetItem.remove();
          refreshExplorerWindows();
        } },
        { type: 'divider' },
        { label: 'Get Info', disabled: true }
      ]);
      return;
    }

    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, defaultMenuItems);
  });

  // Show a simple context menu on windows (Close / Minimize)
  windows.forEach((win) => {
    win.addEventListener('contextmenu', (e) => {
      if (!e.target) return;
      e.preventDefault();
      e.stopPropagation();
      const closeBtn = win.querySelector('.window__control--close');
      const minBtn = win.querySelector('.window__control--minimize');
      const items = [
        { label: 'Close', action: () => { if (closeBtn) closeBtn.click(); } },
        { label: 'Minimize', action: () => { if (minBtn) minBtn.click(); } }
      ];
      showContextMenu(e.clientX, e.clientY, items);
    });
  });

  // Hide on any click or Esc. Only hide on contextmenu when it's outside the desktop/context menu.
  document.addEventListener('click', (ev) => {
    if (ev.target.closest && (ev.target.closest('.desktop-folder') || ev.target.closest('.context-menu') || ev.target.closest('.desktop-folder__rename-input') || ev.target.closest('.dock__item'))) return;
    hideContextMenu();
    hideRenamePanel();
  });
  document.addEventListener('contextmenu', (ev) => {
    if (ev.target.closest && (ev.target.closest('.context-menu') || ev.target.closest('.desktop') || ev.target.closest('.dock') || ev.target.closest('.window'))) return;
    hideContextMenu();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      hideContextMenu();
      hideRenamePanel();
    }
  });

  let marqueeEl = null;
  let startPoint = null;
  let currentPoint = null;
  let isSelecting = false;

  const getDesktopPoint = (clientX, clientY) => {
    const rect = desktopSurfaceEl.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const isSelectionBlockedTarget = (target) => {
    return target.closest('.window') || target.closest('.dock') || target.closest('.desktop__topbar');
  };

  const clearDesktopSelection = () => {
    document.querySelectorAll('.desktop-item.is-selected').forEach((itemEl) => {
      itemEl.classList.remove('is-selected');
    });
  };

  const selectFoldersInRect = (rect) => {
    clearDesktopSelection();
    const selected = [];
    document.querySelectorAll('.desktop-item').forEach((itemEl) => {
      const itemRect = itemEl.getBoundingClientRect();
      const itemCenterX = itemRect.left + itemRect.width / 2;
      const itemCenterY = itemRect.top + itemRect.height / 2;
      const intersects = itemCenterX >= rect.left && itemCenterX <= rect.left + rect.width && itemCenterY >= rect.top && itemCenterY <= rect.top + rect.height;
      if (intersects) {
        itemEl.classList.add('is-selected');
        selected.push(itemEl);
      }
    });

    if (selected.length > 0) {
      desktopEl.dataset.selectionCount = String(selected.length);
    } else {
      delete desktopEl.dataset.selectionCount;
    }
  };

  const createMarquee = (x, y) => {
    marqueeEl = document.createElement('div');
    marqueeEl.id = 'marquee';
    marqueeEl.style.left = `${x}px`;
    marqueeEl.style.top = `${y}px`;
    marqueeEl.style.width = '0px';
    marqueeEl.style.height = '0px';
    desktopSurfaceEl.appendChild(marqueeEl);
  };

  const removeMarquee = () => {
    if (marqueeEl?.parentNode) {
      marqueeEl.parentNode.removeChild(marqueeEl);
    }
    marqueeEl = null;
  };

  desktopEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (!e.target || isSelectionBlockedTarget(e.target)) return;

    const clickedItem = e.target.closest('.desktop-item');
    if (clickedItem) {
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearDesktopSelection();
      }
      clickedItem.classList.add('is-selected');
      e.preventDefault();
      return;
    }

    clearDesktopSelection();
    startPoint = getDesktopPoint(e.clientX, e.clientY);
    currentPoint = { ...startPoint };
    isSelecting = true;
    createMarquee(startPoint.x, startPoint.y);
    e.preventDefault();
  });

  const onMove = (e) => {
    if (!isSelecting || !marqueeEl || !startPoint) return;

    currentPoint = getDesktopPoint(e.clientX, e.clientY);
    const left = Math.min(currentPoint.x, startPoint.x);
    const top = Math.min(currentPoint.y, startPoint.y);
    const width = Math.max(1, Math.abs(currentPoint.x - startPoint.x));
    const height = Math.max(1, Math.abs(currentPoint.y - startPoint.y));

    marqueeEl.style.left = `${left}px`;
    marqueeEl.style.top = `${top}px`;
    marqueeEl.style.width = `${width}px`;
    marqueeEl.style.height = `${height}px`;
  };

  const onUp = () => {
    if (!isSelecting) return;

    isSelecting = false;
    if (!marqueeEl) return;

    const rect = marqueeEl.getBoundingClientRect();
    const desktopRect = desktopSurfaceEl.getBoundingClientRect();
    const normalizedRect = {
      left: rect.left - desktopRect.left,
      top: rect.top - desktopRect.top,
      width: rect.width,
      height: rect.height
    };

    removeMarquee();

    if (normalizedRect.width > 4 && normalizedRect.height > 4) {
      selectFoldersInRect(normalizedRect);
    }

    startPoint = null;
    currentPoint = null;
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSelecting) {
      isSelecting = false;
      clearDesktopSelection();
      removeMarquee();
      startPoint = null;
      currentPoint = null;
    }
  });
})();

// --------------------- Finder (Explorer) interactions ---------------------

const explorerWindows = Array.from(document.querySelectorAll('.window[id^="explorerWindow"]'));
explorerWindows.forEach((windowEl) => initExplorerWindow(windowEl, window.showContextMenu, openTextEditorWindow));
const settingsWindows = Array.from(document.querySelectorAll('.window[id^="settingsWindow"]'));
settingsWindows.forEach((windowEl) => initSettingsWindow(windowEl));

// Ensure Finder navigation buttons don't keep focus (prevents window controls staying visible)
const toolbarButtons = document.querySelectorAll('.toolbar-btn');
if (toolbarButtons && toolbarButtons.length) {
  toolbarButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setTimeout(() => btn.blur(), 0);
    });
    btn.addEventListener('pointerdown', () => btn.blur());
  });
}

