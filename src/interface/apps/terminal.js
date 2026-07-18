export const initTerminalWindow = (windowEl) => {
  if (!windowEl) return;

  const terminalOutput = windowEl.querySelector('.terminal-output');
  const terminalInput = windowEl.querySelector('.terminal-input');
  const promptLabel = '$';
  const getCurrentUsername = () => {
    const candidates = [
      localStorage.getItem('archiware_username'),
      localStorage.getItem('username'),
      localStorage.getItem('userName')
    ];
    const stored = candidates.find((value) => typeof value === 'string' && value.trim());
    return (stored || '').trim() || 'User';
  };
  const startTime = Date.now();

  const appendLine = (text, className = '') => {
    if (!terminalOutput) return;
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`.trim();
    line.innerHTML = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  };

  const runCommand = (inputValue) => {
    const command = String(inputValue || '').trim();
    if (!command) return;

    const promptPrefix = `${getCurrentUsername()}@archiware-os:~$`;
    const commandParts = command.split(/\s+/);
    const isSudo = commandParts[0].toLowerCase() === 'sudo';
    const sudoEnabled = localStorage.getItem('archiware_is_admin') === null || localStorage.getItem('archiware_is_admin') === 'true';
    const actualCommand = isSudo ? commandParts.slice(1).join(' ').trim() : command;
    const displayedCommand = isSudo ? `sudo ${actualCommand}` : actualCommand;

    appendLine(`<span class="terminal-prompt">${promptPrefix}</span> ${displayedCommand}`);

    if (isSudo && !sudoEnabled) {
      appendLine('sudo: permission denied. Administrator mode is disabled in settings.', 'terminal-error');
      return;
    }

    if (isSudo && !actualCommand) {
      appendLine('sudo: no command specified. Usage: sudo <command>', 'terminal-info');
      return;
    }

    const parts = actualCommand.split(/\s+/);
    const action = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (action) {
      case 'help':
        appendLine('Available commands: help, clear, date, echo, uptime, version, about', 'terminal-info');
        break;
      case 'clear':
        if (terminalOutput) terminalOutput.innerHTML = '';
        break;
      case 'date':
        appendLine(new Date().toString(), 'terminal-output-text');
        break;
      case 'echo':
        appendLine(args.join(' '), 'terminal-output-text');
        break;
      case 'uptime': {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        appendLine(`Uptime: ${seconds} second${seconds === 1 ? '' : 's'}`, 'terminal-output-text');
        break;
      }
      case 'version':
        appendLine('Archiware0S Terminal v1.0 — Firmware Archiware0S 27.1 CFE0-BJRKWONM23F', 'terminal-output-text');
        break;
      case 'about':
        appendLine('Liquid Glass Terminal — lightweight shell emulator.', 'terminal-output-text');
        break;
      default:
        appendLine(`Command not found: ${action}. Type \"help\" for available commands.`, 'terminal-error');
        break;
    }
  };

  if (terminalOutput) {
    terminalOutput.innerHTML = '';
    appendLine('Welcome to Archiware Terminal.', 'terminal-welcome');
    appendLine('Type "help" for a list of commands.', 'terminal-info');
  }

  if (terminalInput) {
    terminalInput.value = '';
    terminalInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      runCommand(terminalInput.value);
      terminalInput.value = '';
    });
    terminalInput.focus();
  }
};
