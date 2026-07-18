# Boot Sequence Module

Centralized boot sequence management for ArchiwareOS. This module handles all boot screen animations, F2 UEFI detection, boot timing, and system power states.

## Structure

```
src/interface/bootSequence/
├── index.html              # Autonomous boot sequence page
├── bootSequencePage.js     # Boot page handler (reboot/shutdown logic)
├── bootSequence.js         # Core boot sequence logic (exports)
├── bootSequenceLines.js    # Boot text content (ASCII art + system messages)
├── style.css               # Boot screen styles
└── README.md               # This file
```

## Features

- ✅ Terminal-style animated boot sequence text display
- ✅ Green text with authentic CRT/terminal aesthetic
- ✅ Colorized [ OK ] indicators (bright green)
- ✅ Line-by-line text animation (80ms per line)
- ✅ Autonomous page with reboot and shutdown modes
- ✅ Proper navigation flows for different power states
- ✅ F2 key detection for UEFI entry during boot
- ✅ localStorage caching to avoid repeated boot animation
- ✅ Proper accessibility (aria-hidden attributes)
- ✅ Wake-up on any input after shutdown

## Navigation Flows

### Boot Mode (Regular Startup)
```
Archiware2024 Page
    ↓
startBootSequence() with callbacks
    ↓
Boot animation (4 seconds)
    ↓
Show login/desktop
```

### Reboot Mode
```
Login Page → Click "Reboot"
    ↓
Redirect to bootSequence/?mode=reboot
    ↓
Boot animation (4 seconds)
    ↓
Auto-redirect to login page
```

### Shutdown Mode
```
Login Page → Click "Shutdown"
    ↓
Redirect to bootSequence/?mode=shutdown
    ↓
Boot animation (4 seconds)
    ↓
Black screen (persistent)
    ↓
Any input (key/mouse) → Wake up and redirect to login
```

## Usage

### From Login Page (Reboot/Shutdown)
Already configured! Reboot and Shutdown buttons redirect automatically.

### From Archiware2024 (Dashboard)
```javascript
import { startBootSequence } from '../bootSequence/bootSequence.js';

startBootSequence({
  bootDuration: 4000,
  hideDuration: 1000,
  mode: 'boot',  // or 'reboot', 'shutdown'
  onComplete: () => {
    // Show login/desktop when boot completes
    document.getElementById('lockscreen')?.classList.add('active');
  },
  onF2Detected: () => {
    console.log('F2 detected - redirecting to UEFI');
  },
  onShutdown: () => {
    // This is called for shutdown mode
    showShutdownScreen(); // Auto-called by bootSequencePage.js
  }
});
```

## API Reference

### `startBootSequence(options)`
Start the boot sequence animation.

**Parameters:**
- `options.bootDuration` (number, default: 4000) - Time to display boot screen (ms)
- `options.hideDuration` (number, default: 1000) - Animation fade duration (ms)
- `options.mode` (string, default: 'boot') - Boot mode: 'boot' | 'reboot' | 'shutdown'
- `options.onComplete` (function) - Callback when boot completes (not called for shutdown)
- `options.onF2Detected` (function) - Callback when F2 is detected
- `options.onShutdown` (function) - Callback when shutdown mode completes

### `stopBootSequence()`
Stop boot sequence immediately (hide boot screen).

### `redirectToUefiInstantly()`
Redirect to UEFI setup page.

### `redirectToLogin()`
Redirect to login page.

### `showShutdownScreen()`
Show black shutdown screen with wake-up listeners.

### `isBootingActive()`
Check if boot sequence is currently active.

### `bootSequenceLines`
Exported array of boot text messages (ASCII art + system messages).

## Page URLs

- **Boot Sequence Page**: `src/interface/bootSequence/index.html`
- **Parameters**: 
  - `?mode=reboot` - Reboot mode
  - `?mode=shutdown` - Shutdown mode
  - No parameter or `?mode=boot` - Regular boot

## localStorage Keys

- `bootSequenceMode` - Temporary mode storage (cleaned up after reading)
- `archiware_has_booted` - Tracks if first boot completed

## Notes

- F2 detection is automatic during any boot mode
- Boot screen persists for `bootDuration` milliseconds
- localStorage prevents repeated boot animations on subsequent page loads
- UEFI redirect happens instantly when F2 is detected
- Shutdown mode shows a persistent black screen until user input
- All navigation is automatic - no manual redirects needed from login page
