const DEFAULT_SOURCE = 'https://www.netflix.com/';

const normalizeSource = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return DEFAULT_SOURCE;

  const sanitized = trimmed.replace(/\s+/g, '').replace(/^mailto:/i, '');
  const hasProtocol = /^(https?:\/\/)/i.test(sanitized);
  const candidate = hasProtocol ? sanitized : `https://${sanitized}`;

  try {
    const url = new URL(candidate);
    const path = url.pathname && url.pathname !== '/' ? url.pathname : '/';
    const normalizedPath = path.endsWith('/') ? path : `${path}/`;
    return `${url.protocol}//${url.host}${normalizedPath}`;
  } catch (error) {
    return `https://${sanitized.replace(/^https?:\/\//i, '')}/`;
  }
};

export const initPluberryWindow = (windowEl) => {
  if (!windowEl) return;

  const shell = windowEl.querySelector('.pluberry-shell');
  const frame = windowEl.querySelector('.pluberry-frame');
  const input = windowEl.querySelector('.pluberry-source-input');
  const launchButton = windowEl.querySelector('.pluberry-launch-button');

  if (!shell || !frame || !input || !launchButton) return;

  const resetPluberry = () => {
    input.value = '';
    showLanding();
  };

  const showLanding = () => {
    shell.classList.remove('is-active');
    frame.classList.remove('is-active');
    frame.src = 'about:blank';
  };

  const showSource = (source) => {
    const resolved = normalizeSource(source);
    shell.classList.add('is-active');
    frame.classList.add('is-active');
    frame.src = resolved;
    input.value = resolved;
  };

  launchButton.addEventListener('click', () => {
    showSource(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      showSource(input.value);
    }
  });

  windowEl.addEventListener('keydown', (event) => {
    if (event.key === 'F1') {
      event.preventDefault();
      event.stopPropagation();
      resetPluberry();
    }
  });

  showLanding();
};
