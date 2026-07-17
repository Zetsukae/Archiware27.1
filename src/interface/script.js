import { appSettings, saveAppSettings, applyWindowTransparency, applyDarkMode, applyWallpaper, applyCustomWallpaper, applyDockSettings, applySavedSettings, initSettingsWindow } from './apps/settings.js';
import { initExplorerWindow, renderExplorerWindow, findExplorerNodeById, findExplorerNodePathByName, getExplorerDesktopNode, getExplorerSegments, navigateExplorerWindow, goBackExplorerWindow, goForwardExplorerWindow, createExplorerFolderInWindow, renameExplorerItemInWindow } from './apps/explorer.js';
import { initTextEditorWindow } from './apps/textEditor.js';
import { initPluberryWindow } from './apps/pluberry.js';

const clock = document.getElementById('clock');
const profileTrigger = document.getElementById('profileTrigger');
const profilePopup = document.getElementById('profilePopup');
const powerOffBtn = document.getElementById('powerOffBtn');
const restartBtn = document.getElementById('restartBtn');
const quickFilesBtn = document.getElementById('quickFilesBtn');
const powerOverlay = document.getElementById('powerOverlay');
const minimizedAppsContainer = document.getElementById('minimizedApps');
const calendarPopup = document.getElementById('calendarPopup');
const calendarDate = document.getElementById('calendarDate');
const calendarGrid = document.getElementById('calendarGrid');
const dockItems = document.querySelectorAll('.dock__item');
let windows = document.querySelectorAll('.window');
let windowZIndex = 50;
const windowControls = document.querySelectorAll('.window__control');
const welcomeUsernameEl = document.getElementById('welcomeUsername');
const profileTitleEl = document.getElementById('profileTitle');
const profileSubtitleEl = document.getElementById('profileSubtitle');
const topbar = document.querySelector('.desktop__topbar');
const dock = document.querySelector('.dock');
const appWindowCounters = { explorer: 1, settings: 1, editor: 0, pluberry: 0 };
const windowPlacementState = { offsetX: 30, offsetY: 30 };
let memoryKillSwitchTriggered = false;

const getOpenWindowCount = () => {
  return Array.from(document.querySelectorAll('.window')).filter((win) => !win.classList.contains('is-closed') && !win.classList.contains('is-minimized')).length;
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
    .filter((win) => !win.classList.contains('is-closed') && !win.classList.contains('is-minimized'))
    .sort((a, b) => Number(a.style.zIndex || 0) - Number(b.style.zIndex || 0))
    .pop();

  const baseX = previousWindow ? previousWindow.offsetLeft : padding;
  const baseY = previousWindow ? previousWindow.offsetTop : padding;

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
  if (!isInsideNotificationCenter && !isInsideNotificationStack) {
    closeNotificationCenter();
  }
});

const handleAppShortcuts = (event) => {
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    if (event.key?.toLowerCase() === 'e') {
      event.preventDefault();
      event.stopPropagation();
      launchAppWindow('explorer');
      return;
    }
    if (event.key?.toLowerCase() === 'i') {
      event.preventDefault();
      event.stopPropagation();
      launchAppWindow('settings');
      return;
    }
    if (event.key?.toLowerCase() === 'p') {
      event.preventDefault();
      event.stopPropagation();
      launchAppWindow('pluberry');
    }
  }
};

document.addEventListener('keydown', handleAppShortcuts);

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

const hidePowerOverlay = () => {
  if (!powerOverlay) return;
  powerOverlay.classList.remove('visible');
  powerOverlay.classList.add('hidden');
  powerOverlay.setAttribute('aria-hidden', 'true');
};

const showPowerOverlay = () => {
  if (!powerOverlay) return;
  powerOverlay.classList.remove('hidden');
  powerOverlay.classList.add('visible');
  powerOverlay.setAttribute('aria-hidden', 'false');
};

const shutdown = () => {
  showPowerOverlay();
  const onKey = () => {
    hidePowerOverlay();
    window.removeEventListener('keydown', onKey);
  };
  window.addEventListener('keydown', onKey, { once: true });
};

const reboot = () => {
  showPowerOverlay();

  let f2PressCount = 0;
  let redirectTimer = null;

  const handleRebootKey = (event) => {
    if (event.key !== 'F2') return;

    event.preventDefault();
    f2PressCount += 1;

    if (f2PressCount >= 2 || event.repeat) {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }

      redirectTimer = setTimeout(() => {
        window.location.href = './UEFI/';
      }, 2000);
    }
  };

  window.addEventListener('keydown', handleRebootKey);

  setTimeout(() => {
    window.removeEventListener('keydown', handleRebootKey);
    if (!redirectTimer) {
      hidePowerOverlay();
    }
  }, 2000);
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
  const templateId = appId === 'explorer' ? 'explorerWindow' : appId === 'settings' ? 'settingsWindow' : appId === 'editor' ? 'textEditorWindow' : appId === 'pluberry' ? 'pluberryWindow' : null;
  const template = document.getElementById(templateId);
  if (!template) return null;

  const clone = template.cloneNode(true);
  const instanceId = `${templateId}-${(appWindowCounters[appId] || 0) + 1}`;
  appWindowCounters[appId] = (appWindowCounters[appId] || 0) + 1;
  clone.id = instanceId;
  clone.classList.remove('is-closed', 'is-minimized', 'minimized-hidden');
  clone.setAttribute('aria-hidden', 'false');
  clone.setAttribute('aria-label', appId === 'explorer' ? 'Explorer' : 'Settings');
  clone.dataset.appLabel = appId === 'explorer' ? 'Explorer' : appId === 'settings' ? 'Settings' : appId === 'editor' ? 'Text Editor' : appId === 'pluberry' ? 'Pluberry' : '';
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
  if (appId === 'editor') initTextEditorWindow(clone, findExplorerNodeById, refreshExplorerWindows);
  if (appId === 'pluberry') initPluberryWindow(clone);
  windows = document.querySelectorAll('.window');
  focusWindow(clone);
  setDockOpenState(appId, true);
  enforceMemoryLimit();
  return clone;
};

const openExplorerWindow = () => createAppWindow('explorer');

const openSettingsWindow = () => createAppWindow('settings');
const openPluberryWindow = () => createAppWindow('pluberry');

const openTextEditorWindow = (fileNode) => {
  const win = createAppWindow('editor');
  if (!win) return null;
  if (fileNode) {
    win.dataset.editorFileId = fileNode.id;
    const title = win.querySelector('.finder-title');
    if (title) title.textContent = fileNode.name || 'Untitled';
    const path = win.querySelector('.editor-path');
    if (path) path.textContent = `${fileNode.name}`;
    const area = win.querySelector('.text-editor');
    if (area) area.value = fileNode.content || '';
  }
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

document.addEventListener('click', (event) => {
  if (profilePopup && profilePopup.contains(event.target)) return;
  if (clock && clock.contains(event.target)) return;
  if (calendarPopup && calendarPopup.contains(event.target)) return;
  if (profileTrigger && profileTrigger.contains(event.target)) return;
  if (calendarPopup) hideCalendar();
  if (profilePopup) {
    profilePopup.classList.remove('visible');
    profilePopup.classList.add('hidden');
    profilePopup.setAttribute('aria-hidden', 'true');
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
      const app = item.dataset.app;
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
    const selectedFolders = Array.from(document.querySelectorAll('.desktop-folder.is-selected'));
    selectedFolders.forEach((folderEl) => folderEl.remove());
    clearDesktopSelection();
  };

  const openSelectedFolders = () => {
    const selectedFolders = Array.from(document.querySelectorAll('.desktop-folder.is-selected'));
    selectedFolders.forEach((folderEl) => {
      const name = folderEl.dataset.folderName || folderEl.querySelector('.desktop-folder__name')?.textContent?.trim() || 'New Folder';
      openFolderInExplorer(name);
    });
  };

  const renameSelectedFolders = () => {
    const selectedFolders = Array.from(document.querySelectorAll('.desktop-folder.is-selected'));
    if (selectedFolders.length === 0) return;
    const firstFolder = selectedFolders[0];
    showRenamePanel(firstFolder);
    selectedFolders.slice(1).forEach((folderEl) => folderEl.classList.remove('is-selected'));
  };

  let renameTargetEl = null;

  const getFolderName = (targetEl) => targetEl?.dataset.folderName || targetEl?.querySelector('.desktop-folder__name')?.textContent?.trim() || 'Item';

  const getExistingFolderNames = (currentEl = null) => {
    const currentName = currentEl ? getFolderName(currentEl) : '';
    return Array.from(document.querySelectorAll('.desktop-folder'))
      .map((folderEl) => getFolderName(folderEl))
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
      targetEl.appendChild(input);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const cleanName = input.value.trim();
          if (!cleanName) return;
          const finalName = buildUniqueFolderName(cleanName, targetEl);
          const labelEl = targetEl.querySelector('.desktop-folder__name');
          if (labelEl) {
            labelEl.textContent = finalName;
            labelEl.style.display = 'block';
          }
          targetEl.dataset.folderName = finalName;
          updateDesktopExplorerEntry(targetEl, finalName);
          targetEl.setAttribute('aria-label', finalName);
          targetEl.classList.remove('is-renaming');
          input.style.display = 'none';
          input.blur();
        }
        if (ev.key === 'Escape') {
          ev.preventDefault();
          const labelEl = targetEl.querySelector('.desktop-folder__name');
          if (labelEl) labelEl.style.display = 'block';
          targetEl.classList.remove('is-renaming');
          input.style.display = 'none';
        }
      });
      input.addEventListener('blur', () => {
        const cleanName = input.value.trim();
        if (!cleanName) {
          const labelEl = targetEl.querySelector('.desktop-folder__name');
          if (labelEl) labelEl.style.display = 'block';
          targetEl.classList.remove('is-renaming');
          input.style.display = 'none';
          return;
        }
        const finalName = buildUniqueFolderName(cleanName, targetEl);
        const labelEl = targetEl.querySelector('.desktop-folder__name');
        if (labelEl) {
          labelEl.textContent = finalName;
          labelEl.style.display = 'block';
        }
        targetEl.dataset.folderName = finalName;
        updateDesktopExplorerEntry(targetEl, finalName);
        targetEl.setAttribute('aria-label', finalName);
        targetEl.classList.remove('is-renaming');
        input.style.display = 'none';
      });
    }
    return input;
  };

  const hideRenamePanel = () => {
    if (!renameTargetEl) return;
    const input = renameTargetEl.querySelector('.desktop-folder__rename-input');
    const labelEl = renameTargetEl.querySelector('.desktop-folder__name');
    if (input) input.style.display = 'none';
    if (labelEl) labelEl.style.display = 'block';
    renameTargetEl.classList.remove('is-renaming');
    renameTargetEl = null;
  };

  const showRenamePanel = (targetEl) => {
    if (!targetEl) return;
    const currentName = getFolderName(targetEl);
    const input = ensureRenameInput(targetEl);
    input.value = currentName;
    targetEl.classList.add('is-renaming');
    requestAnimationFrame(() => {
      const labelEl = targetEl.querySelector('.desktop-folder__name');
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
    folder.className = 'desktop-folder';
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

  const actionNewFolder = () => {
    const folder = createDesktopFolderElement(`New Folder ${folderCounter}`);
    if (folder) folderCounter += 1;
  };

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

    const targetItem = e.target.closest('.desktop-folder');
    const selectedFolders = Array.from(document.querySelectorAll('.desktop-folder.is-selected'));
    if (targetItem && (selectedFolders.includes(targetItem) || selectedFolders.length > 0)) {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: selectedFolders.length > 1 ? 'Open All' : 'Open', action: openSelectedFolders },
        { label: selectedFolders.length > 1 ? 'Rename All' : 'Rename', action: renameSelectedFolders },
        { type: 'divider' },
        { label: 'Delete', action: deleteSelectedFolders },
        { type: 'divider' },
        { label: 'Get Info', disabled: true }
      ]);
      return;
    }

    if (targetItem) {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: 'Rename', action: () => renameDesktopItem(targetItem) },
        { type: 'divider' },
        { label: 'Open', action: () => openFolderInExplorer(targetItem.dataset.folderName || 'New Folder') },
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
    document.querySelectorAll('.desktop-folder.is-selected').forEach((folderEl) => {
      folderEl.classList.remove('is-selected');
    });
  };

  const selectFoldersInRect = (rect) => {
    clearDesktopSelection();
    const selected = [];
    document.querySelectorAll('.desktop-folder').forEach((folderEl) => {
      const folderRect = folderEl.getBoundingClientRect();
      const folderCenterX = folderRect.left + folderRect.width / 2;
      const folderCenterY = folderRect.top + folderRect.height / 2;
      const intersects = folderCenterX >= rect.left && folderCenterX <= rect.left + rect.width && folderCenterY >= rect.top && folderCenterY <= rect.top + rect.height;
      if (intersects) {
        folderEl.classList.add('is-selected');
        selected.push(folderEl);
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

    const clickedFolder = e.target.closest('.desktop-folder');
    if (clickedFolder) {
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearDesktopSelection();
      }
      clickedFolder.classList.add('is-selected');
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

