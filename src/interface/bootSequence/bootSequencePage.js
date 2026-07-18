/**
 * Boot Sequence Page Handler
 * Manages the autonomous bootSequence page with reboot and shutdown modes
 * Displays animated terminal text during boot
 */

import { startBootSequence, redirectToLogin, showShutdownScreen, isBootingActive } from './bootSequence.js';
import { bootSequenceLines } from './bootSequenceLines.js';

// Get boot mode from URL or localStorage
function getBootMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || localStorage.getItem('bootSequenceMode') || 'boot';
  
  // Clean up localStorage after reading
  localStorage.removeItem('bootSequenceMode');
  
  return mode;
}

/**
 * Display boot sequence text line by line
 */
function displayBootText() {
  const bootLog = document.getElementById('bootLog');
  console.log('bootLog element:', bootLog);
  
  if (!bootLog) {
    console.error('Boot log element not found!');
    return;
  }

  const textDelay = 60; // ms between lines for faster display
  const firstBootLineIndex = bootSequenceLines.findIndex((line) => line.startsWith('Starting ') || line.startsWith('[ '));
  const asciiLines = firstBootLineIndex === -1 ? bootSequenceLines : bootSequenceLines.slice(0, firstBootLineIndex);
  const animatedLines = firstBootLineIndex === -1 ? [] : bootSequenceLines.slice(firstBootLineIndex);

  const createLineElement = (line) => {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'boot-line';

    // Parse and colorize [ OK ] tags while keeping brackets white
    if (line.includes('[ OK ]')) {
      const parts = line.split(/(\[ OK \])/g);
      parts.forEach((part) => {
        if (part === '[ OK ]') {
          const bracketSpan = document.createElement('span');
          bracketSpan.textContent = '[';
          lineDiv.appendChild(bracketSpan);

          const okSpan = document.createElement('span');
          okSpan.className = 'boot-line-ok';
          okSpan.textContent = 'OK';
          lineDiv.appendChild(okSpan);

          const closingBracketSpan = document.createElement('span');
          closingBracketSpan.textContent = ']';
          lineDiv.appendChild(closingBracketSpan);
        } else if (part) {
          const textSpan = document.createElement('span');
          textSpan.textContent = part;
          lineDiv.appendChild(textSpan);
        }
      });
    } else {
      lineDiv.textContent = line;
    }

    return lineDiv;
  };

  const appendVisibleLine = (line, animated = true) => {
    const lineDiv = createLineElement(line);
    bootLog.appendChild(lineDiv);

    if (animated) {
      requestAnimationFrame(() => {
        lineDiv.classList.add('is-visible');
        bootLog.scrollTop = bootLog.scrollHeight;
      });
    } else {
      lineDiv.classList.add('is-visible');
      bootLog.scrollTop = bootLog.scrollHeight;
    }
  };

  asciiLines.forEach((line) => appendVisibleLine(line, false));

  let lineIndex = 0;
  const revealNextLine = () => {
    if (lineIndex >= animatedLines.length) {
      console.log('Boot text animation complete');
      return;
    }

    appendVisibleLine(animatedLines[lineIndex], true);
    lineIndex++;
    setTimeout(revealNextLine, textDelay);
  };

  revealNextLine();
}

// Initialize boot sequence when page loads
window.addEventListener('load', () => {
  console.log('Boot page loaded');
  const mode = getBootMode();
  console.log('Boot mode:', mode);
  
  // Start displaying boot text immediately
  displayBootText();
  
  // Start the boot sequence timer
  startBootSequence({
    bootDuration: 6500,  // Increased to allow full text display (~75 lines * 60ms)
    hideDuration: 1000,
    mode: mode,
    onComplete: () => {
      console.log(`Boot sequence completed (mode: ${mode})`);
      
      // For reboot mode, redirect to login after boot
      if (mode === 'reboot') {
        setTimeout(() => {
          console.log('Redirecting to login...');
          redirectToLogin();
        }, 500);
      }
    },
    onShutdown: () => {
      console.log('Shutdown sequence completed - showing black screen');
      // Show black screen and wait for wake-up
      showShutdownScreen();
    },
    onF2Detected: () => {
      console.log('F2 detected - redirecting to UEFI');
    }
  });
});

