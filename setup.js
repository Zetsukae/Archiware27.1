const steps = Array.from(document.querySelectorAll('.step'));
const stepIndicator = document.getElementById('stepIndicator');
const actionButton = document.getElementById('actionButton');
const backButton = document.querySelector('[data-action="back"]');
const usernameInput = document.getElementById('username');
const avatarOptions = Array.from(document.querySelectorAll('.avatar-option'));
const toggleButtons = Array.from(document.querySelectorAll('.toggle'));
const progressFill = document.getElementById('progressFill');
const statusText = document.getElementById('statusText');

const params = new URLSearchParams(window.location.search);
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
  return new URL(`src/public/avatars/${avatarValue}`, window.location.href).href;
};

const shouldSkipSetup = localStorage.getItem('archiware_setup_complete') === 'true' && params.get('reset') !== '1';

if (shouldSkipSetup) {
  window.location.replace('src/interface/login/');
}

// Disable context menu for better experience
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

const state = {
  currentStep: 1,
  username: '',
  password: '',
  passwordStrength: 0,
  avatar: 'happy_avatar.svg',
  options: {},
  requiresInternet: false,
  legalAccepted: false,
  legalLoaded: false
};

const statusMessages = {
  standard: [
    'Preparing your workspace…',
    'Optimizing the Liquid Glass interface…',
    'Finalizing your profile settings…',
    'ArchiwareOS is ready!'
  ],
  internet: [
    'Preparing your workspace…',
    'Downloading the latest driver bundle…',
    'Optimizing the Liquid Glass interface…',
    'Finalizing your profile settings…',
    'Finishing touches…',
    'ArchiwareOS is ready!'
  ]
};

const stepThumb = document.createElement('span');
stepThumb.className = 'step-indicator__thumb';
stepThumb.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.35s ease';

const updateStepThumb = () => {
  const activeDot = stepIndicator.querySelector('.step-dot.active');
  if (!activeDot || !stepThumb) return;

  const offset = activeDot.offsetLeft + activeDot.offsetWidth / 2 - stepThumb.offsetWidth / 2;
  stepThumb.style.transform = `translate(${offset}px, -50%)`;
};

const getTotalSteps = () => steps.length;

const renderIndicators = () => {
  stepIndicator.innerHTML = '';
  const totalSteps = getTotalSteps();
  for (let index = 0; index < totalSteps; index += 1) {
    const dot = document.createElement('span');
    dot.className = `step-dot ${index + 1 === state.currentStep ? 'active' : ''}`;
    stepIndicator.appendChild(dot);
  }

  stepIndicator.appendChild(stepThumb);
  requestAnimationFrame(() => {
    updateStepThumb();
  });
};

const updateStepLabels = () => {
  const totalSteps = getTotalSteps();
  steps.forEach((step, index) => {
    const label = step.querySelector('.step-label');
    if (!label) return;
    label.textContent = `Step ${index + 1} / ${totalSteps}`;
  });
};

const renderButtons = () => {
  const hideBackButton = state.currentStep === 1 || state.currentStep === getTotalSteps() - 1 || state.currentStep === getTotalSteps();
  const isStepTwo = state.currentStep === 2;
  const isStepThree = state.currentStep === 3;
  const usernameMissing = isStepThree && !state.username;
  const passwordTooWeak = isStepThree && state.passwordStrength < 2;
  const legalMissing = isStepTwo && !state.legalAccepted;
  const licenseStillLoading = isStepTwo && !state.legalLoaded;

  if (hideBackButton) {
    backButton.classList.add('hidden');
  } else {
    backButton.classList.remove('hidden');
  }

  if (state.currentStep === getTotalSteps() - 1) {
    actionButton.classList.add('hidden');
    return;
  }

  actionButton.classList.remove('hidden');

  if (state.currentStep === getTotalSteps()) {
    actionButton.textContent = 'Start the adventure';
    actionButton.setAttribute('data-action', 'finish');
    actionButton.disabled = false;
  } else if (state.currentStep === getTotalSteps() - 1) {
    actionButton.textContent = 'Working…';
    actionButton.disabled = true;
  } else {
    actionButton.textContent = 'Continue';
    actionButton.setAttribute('data-action', 'next');
    actionButton.disabled = legalMissing || usernameMissing || passwordTooWeak;
  }
};

const renderStep = () => {
  steps.forEach((step) => {
    step.classList.toggle('active', Number(step.dataset.step) === state.currentStep);
  });
  updateStepLabels();
  renderIndicators();
  renderButtons();
};

const goToStep = (nextStep) => {
  state.currentStep = nextStep;
  renderStep();
  requestAnimationFrame(updateStepThumb);
};

const handleNext = () => {
  if (state.currentStep === 2 && !state.legalAccepted) {
    return;
  }

  if (state.currentStep === 3) {
    if (!state.username) {
      return;
    }

    if (state.passwordStrength < 2) {
      return;
    }

    goToStep(4);
    return;
  }

  if (state.currentStep === 4) {
    const enableInternetStep = state.options.advancedEffects === true;
    state.requiresInternet = enableInternetStep;

    if (enableInternetStep) {
      goToStep(5);
      return;
    }

    goToStep(6);
    startSetupSequence();
    return;
  }

  if (state.currentStep === 5 && state.requiresInternet) {
    goToStep(6);
    startSetupSequence();
    return;
  }

  if (state.currentStep < getTotalSteps()) {
    goToStep(state.currentStep + 1);
  }
};

const handleBack = () => {
  if (state.currentStep > 1) {
    goToStep(state.currentStep - 1);
  }
};

const handleFinish = () => {
  if (actionButton) {
    actionButton.disabled = true;
  }
  if (backButton) {
    backButton.disabled = true;
  }

  localStorage.setItem('archiware_username', state.username || 'Guest');
  localStorage.setItem('archiware_password', state.password || '');
  localStorage.setItem('archiware_profile', resolveAvatarUrl(state.avatar));
  localStorage.setItem('archiware_setup_complete', 'true');
  localStorage.setItem('archiware_session_active', 'false');
  localStorage.setItem('archiware_effects_enabled', String(state.options.advancedEffects));
  localStorage.setItem('archiware_error_reports', String(state.options.errorReports));
  localStorage.setItem('archiware_localization', String(state.options.localization));

  setTimeout(() => {
    const screenFade = document.createElement('div');
    screenFade.className = 'screen-fade';
    document.body.appendChild(screenFade);

    requestAnimationFrame(() => {
      screenFade.classList.add('visible');
    });

    setTimeout(() => {
      window.location.href = 'src/interface/login/';
    }, 5000);
  }, 2000);
};

const startSetupSequence = () => {
  let progress = 0;
  let elapsedSeconds = 0;
  const totalSteps = state.requiresInternet ? 40 : 10;
  const statuses = state.requiresInternet ? statusMessages.internet : statusMessages.standard;
  const thresholds = state.requiresInternet ? [0, 5, 24, 31, 36, 40] : [0, 3, 6, 9];

  const interval = window.setInterval(() => {
    elapsedSeconds += 1;
    progress += 100 / totalSteps;
    if (progressFill) progressFill.style.width = `${Math.min(progress, 100)}%`;

    let statusIndex = statuses.length - 1;
    for (let i = thresholds.length - 1; i >= 0; i -= 1) {
      if (elapsedSeconds >= thresholds[i]) {
        statusIndex = i;
        break;
      }
    }

    if (statusText) statusText.textContent = statuses[statusIndex];

    if (progress >= 100) {
      window.clearInterval(interval);
      goToStep(getTotalSteps());
    }
  }, 1000);
};


if (usernameInput) {
  usernameInput.addEventListener('input', (event) => {
    state.username = event.target.value.trim();
    renderButtons();
  });
}

const calculatePasswordStrength = (password) => {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) strength++;
  return Math.min(strength, 5);
};

const updatePasswordStrength = () => {
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  if (!strengthFill || !strengthText) return;

  const strength = state.passwordStrength;
  const fills = ['—', '🔴 Weak', '🟠 Fair', '🟡 Good', '🟢 Strong', '💚 Very Strong'];
  const colors = ['transparent', '#ff4444', '#ff8800', '#ffcc00', '#88cc00', '#00dd00'];

  strengthText.textContent = `Password strength: ${fills[strength]}`;
  strengthFill.style.width = `${(strength / 5) * 100}%`;
  strengthFill.style.background = colors[strength];
};

const passwordInput = document.getElementById('password');
if (passwordInput) {
  passwordInput.addEventListener('input', (event) => {
    state.password = event.target.value;
    state.passwordStrength = calculatePasswordStrength(state.password);
    updatePasswordStrength();
    renderButtons();
  });
}

// Avatar selection
const resizeAvatarToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 256;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.9));
      };
      image.onerror = reject;
      image.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const initializeAvatarSelection = () => {
  const avatarButton = document.getElementById('avatarButton');
  const avatarPicker = document.getElementById('avatarPicker');
  const avatarPreview = document.getElementById('avatarPreview');
  const customAvatarButton = document.getElementById('customAvatarButton');
  const customAvatarInput = document.getElementById('customAvatarInput');
  const avatarPickerOptions = Array.from(
    document.querySelectorAll('.avatar-picker-option:not(.avatar-picker-custom)')
  );

  if (!avatarButton || !avatarPicker) return;

  if (avatarPickerOptions.length > 0) {
    avatarPickerOptions[0].classList.add('active');
    state.avatar = resolveAvatarUrl(avatarPickerOptions[0].dataset.avatar);
    avatarPreview.src = resolveAvatarUrl(avatarPickerOptions[0].dataset.avatar);
  }

  avatarButton.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarPicker.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (e.target !== avatarButton && !avatarPicker.contains(e.target)) {
      avatarPicker.classList.add('hidden');
    }
  });

  avatarPickerOptions.forEach((button) => {
    button.addEventListener('click', () => {
      avatarPickerOptions.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      const previewUrl = resolveAvatarUrl(button.dataset.avatar);
      state.avatar = previewUrl;
      avatarPreview.src = previewUrl;
      avatarPicker.classList.add('hidden');
    });
  });

  if (customAvatarButton && customAvatarInput) {
    customAvatarButton.addEventListener('click', () => {
      customAvatarInput.click();
    });

    customAvatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        try {
          const dataUrl = await resizeAvatarToDataUrl(file);
          avatarPickerOptions.forEach((btn) => btn.classList.remove('active'));
          customAvatarButton.classList.add('active');
          state.avatar = dataUrl;
          avatarPreview.src = dataUrl;
          avatarPicker.classList.add('hidden');
        } catch (error) {
          console.warn('Avatar upload failed:', error);
        }
      }
    });
  }
};

initializeAvatarSelection();

const legalAcceptInput = document.getElementById('legalAccept');
const licenseContentEl = document.getElementById('licenseContent');

const loadRootLicense = async () => {
  if (!licenseContentEl) return;
  if (legalAcceptInput) {
    legalAcceptInput.disabled = true;
  }

  const licenseUrl = new URL('LICENSE', window.location.href).href;

  try {
    const response = await fetch(licenseUrl, { cache: 'reload' });
    if (response.ok) {
      const text = await response.text();
      licenseContentEl.textContent = text.trim() || 'LICENSE file is empty.';
    } else {
      throw new Error('LICENSE not found');
    }
  } catch (error) {
    licenseContentEl.textContent = 'Unable to load LICENSE file from the root path.';
    console.warn('License load failed:', error, licenseUrl);
  }

  state.legalLoaded = true;
  if (legalAcceptInput) {
    legalAcceptInput.disabled = false;
  }
  renderButtons();
};

if (legalAcceptInput) {
  legalAcceptInput.checked = false;
  state.legalAccepted = false;
  legalAcceptInput.addEventListener('change', (event) => {
    state.legalAccepted = event.target.checked;
    renderButtons();
  });
}

loadRootLicense();


avatarOptions.forEach((button) => {
  button.addEventListener('click', () => {
    avatarOptions.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.avatar = button.dataset.avatar;
  });
});

// Toggle buttons for options
const initToggleState = () => {
  toggleButtons.forEach((toggle) => {
    const key = toggle.dataset.option;
    const isActive = toggle.classList.contains('active');
    state.options[key] = isActive;
    toggle.setAttribute('aria-pressed', String(isActive));
    toggle.classList.toggle('active', isActive);
  });
};

toggleButtons.forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const key = toggle.dataset.option;
    state.options[key] = !state.options[key];
    toggle.classList.toggle('active', state.options[key]);
    toggle.setAttribute('aria-pressed', String(state.options[key]));
  });
});

initToggleState();

const generateWifiName = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 13) + 8; // 8 to 20 characters
  let name = '';
  for (let i = 0; i < length; i += 1) {
    name += chars[Math.floor(Math.random() * chars.length)];
  }
  return name;
};

const wifiNetworks = [generateWifiName(), generateWifiName(), 'i have wifi and u not'];
const connectCard = document.querySelector('.connect-card');
const wifiButtons = Array.from(document.querySelectorAll('.wifi-network'));
const wifiPassword = document.querySelector('.wifi-password');
const wifiConnectButton = document.querySelector('.wifi-connect');
const wifiFeedback = document.querySelector('.wifi-feedback');
const connectableNetwork = wifiNetworks[0];
let selectedNetwork = connectableNetwork;

wifiButtons.forEach((button, index) => {
  const networkName = wifiNetworks[index] || button.dataset.network;
  button.querySelector('span').textContent = networkName;
  button.dataset.network = networkName;
  button.addEventListener('click', () => {
    wifiButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    selectedNetwork = button.dataset.network;
    wifiFeedback.textContent = 'Enter the password to connect.';
  });
});

if (wifiConnectButton) {
  const lockConnectionUI = (locked) => {
    wifiConnectButton.disabled = locked;
    wifiPassword.disabled = locked;
    wifiButtons.forEach((button) => {
      button.disabled = locked;
      button.style.pointerEvents = locked ? 'none' : '';
    });
    backButton.disabled = locked;
    actionButton.disabled = locked;
  };

  wifiConnectButton.addEventListener('click', () => {
    const password = wifiPassword?.value.trim();

    if (!password) {
      wifiFeedback.textContent = 'A password is required to connect.';
      return;
    }

    if (password.length < 4) {
      wifiFeedback.textContent = 'Password must be at least 4 characters.';
      return;
    }

    wifiFeedback.textContent = 'Attempting to connect…';
    lockConnectionUI(true);
    wifiConnectButton.textContent = 'Connecting…';

    setTimeout(() => {
      const isSuccess = selectedNetwork === connectableNetwork;

      if (isSuccess) {
        wifiFeedback.textContent = `Connected to ${connectableNetwork}. Continuing…`;
        wifiConnectButton.textContent = 'Connected';
        if (state.currentStep === 5) {
          setTimeout(() => {
            goToStep(6);
            startSetupSequence();
          }, 500);
        }
      } else {
        wifiFeedback.textContent = `Unable to connect to ${selectedNetwork}. Please try another network or check the password.`;
        wifiConnectButton.textContent = 'Connect';
        lockConnectionUI(false);
      }
    }, 4500);
  });
}


document.addEventListener('click', (event) => {

  const button = event.target.closest('button');
  if (!button) return;

  const action = button.getAttribute('data-action');
  if (action === 'next') {
    handleNext();
  } else if (action === 'back') {
    handleBack();
  } else if (action === 'finish') {
    handleFinish();
  }
});

// Initial render
renderStep();