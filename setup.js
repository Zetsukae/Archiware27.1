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
const shouldSkipSetup = localStorage.getItem('archiware_setup_complete') === 'true' && params.get('reset') !== '1';

if (shouldSkipSetup) {
  window.location.replace('src/interface/index.html');
}

// Disable context menu for better experience
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

const state = {
  currentStep: 1,
  username: '',
  avatar: 'avatar-1',
  options: {},
  requiresInternet: false,
  legalAccepted: false
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
  const legalMissing = isStepTwo && !state.legalAccepted;

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
    actionButton.disabled = legalMissing || usernameMissing;
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
  localStorage.setItem('archiware_profile', state.avatar);
  localStorage.setItem('archiware_setup_complete', 'true');
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
      window.location.href = 'src/interface/index.html';
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

const legalAcceptInput = document.getElementById('legalAccept');
const licenseContentEl = document.getElementById('licenseContent');

const loadRootLicense = async () => {
  if (!licenseContentEl) return;
  try {
    const response = await fetch('./LICENSE');
    if (!response.ok) throw new Error('LICENSE unavailable');
    const text = await response.text();
    licenseContentEl.textContent = text.trim() || 'LICENSE file is empty.';
  } catch (error) {
    licenseContentEl.textContent = 'Unable to load LICENSE file from the root path.';
  }
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