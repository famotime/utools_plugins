# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a collection of uTools plugins for Windows. uTools is a productivity launcher platform, and this repository contains multiple standalone plugins that extend its functionality. Each plugin is self-contained with its own configuration, UI, and logic.

## Project Structure

The repository contains multiple plugins in separate directories:

- `always_on/` - Keep-awake plugin that prevents screen sleep/screensaver/hibernation
- `mouse_switch/` - Mouse button swapping plugin for left/right-handed users
- `uTools 开发者文档/` - Official uTools development documentation (reference only)

Each plugin directory contains:
- `plugin.json` - Plugin manifest and configuration (required)
- `preload.js` - Node.js backend script with system API access (required)
- `index.html` - Plugin UI interface
- `logo.png` - Plugin icon
- `README.md` or `PRD.md` - Plugin-specific documentation

## Plugin Architecture

### plugin.json Structure

Each plugin requires a `plugin.json` with:
- `pluginName` - Display name
- `description` - Brief description
- `version` - Semantic version
- `main` - Entry HTML file (usually `index.html`)
- `preload` - Backend script (usually `preload.js`)
- `logo` - Icon file
- `features` - Array of feature definitions with:
  - `code` - Unique feature identifier
  - `explain` - Feature description
  - `cmds` - Keyword triggers for activation
  - `mode` - Entry mode (`"none"` for no input required)
- `options` (optional) - User configuration settings
- `pluginSetting` (optional) - Window/behavior settings

### Two-Process Model

uTools plugins use a two-process architecture:

1. **Frontend (index.html)**: Rendered UI with restricted privileges
   - Standard HTML/CSS/JavaScript
   - Cannot directly access Node.js APIs
   - Communicates with preload via `window.exports`

2. **Backend (preload.js)**: Node.js environment with system access
   - Full Node.js and Electron API access
   - Windows PowerShell execution for system operations
   - Exposes methods via `window.exports` for frontend consumption
   - Can access `utools` API for notifications, database, paths, etc.

### Communication Pattern

Frontend calls backend methods through the `window.exports` object:
```javascript
// In preload.js
window.exports = {
  "feature_code": {
    mode: "none",
    args: {
      enter: () => { /* entry logic */ },
      methodName: (callback) => { /* exposed method */ }
    }
  }
};

// In index.html
window.exports.feature_code.args.methodName((result) => {
  // handle result
});
```

## Windows System Integration

Both plugins heavily use PowerShell for Windows system API access:

### PowerShell Execution Pattern
1. Create C# code with P/Invoke declarations for Windows APIs
2. Use `Add-Type` to compile and load the code
3. Call the Windows API functions
4. Execute via `child_process.exec()` or `child_process.spawn()`

### Common APIs Used
- `SetThreadExecutionState` - Prevent sleep/screensaver (always_on)
- `SystemParametersInfo` - Screen saver control (always_on)
- `SwapMouseButton` / `GetSystemMetrics` - Mouse button swapping (mouse_switch)
- `powercfg` commands - Power settings management (always_on)

### Process Management
- PowerShell scripts written to temp directory via `utools.getPath('temp')`
- Background processes spawned with `windowsHide: true`
- Process state persisted to JSON files for cross-session tracking
- Process cleanup uses `taskkill` with PID tracking

## Development Workflow

### Testing Plugins
1. Open uTools developer tools
2. Load plugin directory (not the root, but individual plugin folders like `always_on/`)
3. Test by entering plugin keywords in uTools launcher
4. Check console logs via uTools DevTools

### Building for Distribution
1. Ensure all assets (HTML, JS, CSS, images) are in plugin directory
2. Use uTools developer tools to build `.upx` package
3. No compilation needed - plugins use vanilla HTML/CSS/JavaScript

### Installing Plugins
- **Method 1**: Install from uTools plugin marketplace
- **Method 2**: Build `.upx` package and install manually

## Key uTools APIs

### Database
- `utools.db.get(id)` - Retrieve document
- `utools.db.put(doc)` - Save/update document with `_id` and `_rev`

### Notifications
- `utools.showNotification(message)` - Display system notification

### Paths
- `utools.getPath('temp')` - Get system temp directory

### Configuration
- Plugin options defined in `plugin.json` under `options`
- Stored in database with custom key (e.g., `'plugin_name_config'`)

## Plugin-Specific Notes

### always_on Plugin
- Uses multiple redundant mechanisms for reliability:
  1. Electron `powerSaveBlocker` API (primary)
  2. PowerShell with `SetThreadExecutionState` (fallback)
  3. Power settings modification via `powercfg`
  4. Screensaver disable via `SystemParametersInfo`
- Maintains persistent background PowerShell process
- State persisted across uTools restarts
- Restores original power settings on stop

### mouse_switch Plugin
- Two modes: manual switch (button click) or auto-switch (on entry)
- Configuration stored in uTools database
- Uses PowerShell with Windows user32.dll APIs
- Immediate feedback via notifications

## Windows-Specific Considerations

- All PowerShell executions use `-NoProfile -ExecutionPolicy Bypass` flags
- Temporary script files created in system temp directory
- Process verification uses `tasklist` command with PID filtering
- Error handling for PowerShell execution failures
- Admin privileges may be required for some system modifications

## File Modification Guidelines

- **Never modify** files in `uTools 开发者文档/` - these are reference docs
- When editing plugin code, maintain the two-process architecture
- Always test both frontend UI updates and backend system interactions
- Preserve PowerShell script error handling and logging patterns
- Keep plugin.json version updated when making changes
