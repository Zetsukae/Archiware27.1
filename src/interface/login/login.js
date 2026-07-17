import { bootSequenceLines } from '../bootSequence.js';

const loginBackground = document.getElementById('loginBackground');
const loginContainer = document.getElementById('loginContainer');
const loginCard = document.getElementById('loginCard');
const loginForm = document.getElementById('loginForm');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const loginTime = document.getElementById('loginTime');
const userAvatarImg = document.getElementById('userAvatarImg');
const userName = document.getElementById('userName');

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
  return new URL(`../../public/avatars/${avatarValue}`, window.location.href).href;
};

const getProjectRootUrl = () => {
  const pathname = window.location.pathname;
  const srcIndex = pathname.indexOf('/src/');
  if (srcIndex !== -1) {
    const rootPath = pathname.slice(0, srcIndex) || '/';
    return new URL(rootPath.endsWith('/') ? rootPath : `${rootPath}/`, window.location.href).href;
  }
  return new URL('./', window.location.href).href;
};

const resolveWallpaperUrl = (wallpaperValue) => {
  if (!wallpaperValue) {
    return new URL('src/public/wallpapers/wallpaper.png', getProjectRootUrl()).href;
  }
  if (wallpaperValue.startsWith('data:') || wallpaperValue.startsWith('http://') || wallpaperValue.startsWith('https://') || wallpaperValue.startsWith('blob:')) {
    return wallpaperValue;
  }
  return new URL(wallpaperValue, getProjectRootUrl()).href;
};

// Load wallpaper
const loadWallpaper = () => {
  const savedWallpaper = localStorage.getItem('archiware_wallpaper');
  const wallpaperUrl = resolveWallpaperUrl(savedWallpaper);
  
  loginBackground.style.backgroundImage = `url('${wallpaperUrl}')`;
};

// Update time display
const updateTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  loginTime.textContent = `${hours}:${minutes}`;
};

// Load user info
const loadUserInfo = () => {
  const savedUsername = localStorage.getItem('archiware_username') || 'User';
  const savedProfile = localStorage.getItem('archiware_profile') || 'happy_avatar.svg';
  
  userName.textContent = savedUsername;
  userAvatarImg.src = resolveAvatarUrl(savedProfile);
};

// Show login card on click or keyboard input
const showLoginCard = () => {
  if (!loginCard) return;
  if (loginCard.classList.contains('visible')) return;
  loginCard.classList.add('visible');
  if (loginTime) {
    loginTime.classList.add('is-active');
  }
  if (settingsMenuButton) {
    settingsMenuButton.classList.add('visible');
  }
  setTimeout(() => {
    if (loginPassword) {
      loginPassword.focus();
    }
  }, 0);
};

// Hide login card
const hideLoginCard = () => {
  loginCard.classList.remove('visible');
  if (loginTime) {
    loginTime.classList.remove('is-active');
  }
  if (settingsMenuButton) {
    settingsMenuButton.classList.remove('visible');
  }
  if (settingsMenu) {
    settingsMenu.classList.remove('visible');
  }
};

// Click on background or container to show login
if (loginContainer) {
  loginContainer.addEventListener('click', (e) => {
    if (e.target === loginContainer && !loginCard.classList.contains('visible')) {
      showLoginCard();
    }
  });
}

// Also allow clicking outside the card to hide it
if (document.body) {
  document.body.addEventListener('click', (e) => {
    if (e.target === document.body && loginCard.classList.contains('visible')) {
      hideLoginCard();
    }
  });
}

const handleKeyboardReveal = (event) => {
  if (!loginCard) return;
  if (event.key === 'Escape') {
    hideLoginCard();
    return;
  }
  if (loginCard.classList.contains('visible')) return;
  if (event.key === 'Tab' || event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt') return;
  if (event.key.length !== 1 && !['Backspace','Enter','Space'].includes(event.key)) return;
  showLoginCard();
};

window.addEventListener('keydown', handleKeyboardReveal);
document.addEventListener('keydown', handleKeyboardReveal);

const validateLogin = (username, password) => {
  const savedUsername = localStorage.getItem('archiware_username');
  const savedPassword = localStorage.getItem('archiware_password');

  if (!savedUsername || !savedPassword) {
    return { success: false, error: 'Setup not completed. Please run setup first.' };
  }

  const inputUsername = localStorage.getItem('archiware_username');
  if (username.trim() === inputUsername && password === savedPassword) {
    return { success: true };
  }

  return { success: false, error: 'Invalid password.' };
};

const showError = (message) => {
  loginError.textContent = message;
  loginError.style.display = 'block';
};

const hideError = () => {
  loginError.style.display = 'none';
};

const handleLogin = (event) => {
  event.preventDefault();
  hideError();

  const password = loginPassword.value || '';

  if (!password) {
    showError('Please enter your password.');
    return;
  }

  const savedUsername = localStorage.getItem('archiware_username') || 'User';
  const result = validateLogin(savedUsername, password);

  if (!result.success) {
    showError(result.error);
    loginPassword.value = '';
    return;
  }

  localStorage.setItem('archiware_session_active', 'true');

  // Success - fade out and redirect
  loginCard.style.opacity = '0';
  loginCard.style.transform = 'scale(0.95)';
  loginCard.style.transition = 'all 0.3s ease';

  setTimeout(() => {
    window.location.href = '../index.html';
  }, 300);
};

if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

if (loginPassword) {
  loginPassword.addEventListener('input', hideError);
}

// Prevent login card closing when clicking inside it
if (loginCard) {
  loginCard.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Power sequence animation
const runPowerSequence = (mode, options = {}) => {
  const powerOverlay = document.getElementById('powerOverlay');
  const powerLog = document.getElementById('powerLog');
  const powerTitle = document.getElementById('powerTitle');
  
  if (!powerOverlay || !powerLog) return;
  
  const shouldWaitForKey = options.waitForKey || false;
  const delay = mode === 'shutdown' ? 120 : 140;
  
  powerOverlay.classList.add('visible');
  powerLog.innerHTML = '';
  
  let lineIndex = 0;
  
  const revealNextLine = () => {
    if (lineIndex >= bootSequenceLines.length) {
      setTimeout(() => {
        powerLog.innerHTML = '';
        powerLog.scrollTop = 0;
        if (shouldWaitForKey) {
          // Wait for key press
          const handleKeyForShutdown = () => {
            document.removeEventListener('keydown', handleKeyForShutdown);
            window.removeEventListener('keydown', handleKeyForShutdown);
            powerOverlay.classList.remove('visible');
            setTimeout(() => {
              runPowerSequence(mode, options);
            }, 300);
          };
          document.addEventListener('keydown', handleKeyForShutdown);
          window.addEventListener('keydown', handleKeyForShutdown);
        } else {
          setTimeout(() => {
            powerOverlay.classList.remove('visible');
          }, 3000);
        }
      }, 200);
      return;
    }
    
    const line = bootSequenceLines[lineIndex];
    const lineDiv = document.createElement('div');
    lineDiv.className = 'power-line';
    
    if (line.includes('[ OK ]')) {
      const parts = line.split('[ OK ]');
      const beforeOK = parts[0];
      const afterOK = parts[1] || '';
      lineDiv.innerHTML = beforeOK + '[ <span style="color:#4ade80">OK</span> ]' + afterOK;
    } else {
      lineDiv.textContent = line;
    }
    
    powerLog.appendChild(lineDiv);
    
    requestAnimationFrame(() => {
      lineDiv.classList.add('is-visible');
      if (powerLog) {
        powerLog.scrollTop = powerLog.scrollHeight;
      }
    });
    
    lineIndex++;
    
    setTimeout(revealNextLine, delay);
  };
  
  revealNextLine();
};

// Settings menu functionality
const settingsMenuButton = document.getElementById('settingsMenuButton');
const settingsMenu = document.getElementById('settingsMenu');
const rebootOption = document.getElementById('rebootOption');
const shutdownOption = document.getElementById('shutdownOption');

if (settingsMenuButton) {
  settingsMenuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle('visible');
  });
}

if (rebootOption) {
  rebootOption.addEventListener('click', () => {
    settingsMenu.classList.remove('visible');
    localStorage.setItem('archiware_session_active', 'false');
    runPowerSequence('reboot');
  });
}

if (shutdownOption) {
  shutdownOption.addEventListener('click', () => {
    settingsMenu.classList.remove('visible');
    localStorage.setItem('archiware_session_active', 'false');
    runPowerSequence('shutdown', { waitForKey: true });
  });
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (settingsMenu && settingsMenuButton) {
    if (e.target !== settingsMenu && e.target !== settingsMenuButton && !settingsMenuButton.contains(e.target) && !settingsMenu.contains(e.target)) {
      settingsMenu.classList.remove('visible');
    }
  }
});

window.addEventListener('load', () => {
  if (localStorage.getItem('archiware_setup_complete') === 'true' && localStorage.getItem('archiware_session_active') === 'true') {
    window.location.replace('../index.html');
    return;
  }

  loadWallpaper();
  loadUserInfo();
  updateTime();
  
  // Update time every minute
  setInterval(updateTime, 60000);
});
