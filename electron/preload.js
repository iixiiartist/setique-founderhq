const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Platform information
  platform: process.platform,
  
  // App version
  appVersion: process.env.npm_package_version || '1.0.0',
  
  // Example: Add any Electron-specific APIs you need here
  // For example, file system operations, notifications, etc.
  
  // Send message to main process
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Receive message from main process
  receive: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  
  // Example: Open external links in default browser
  openExternal: (url) => {
    require('electron').shell.openExternal(url);
  }
});

// Make environment variables available
contextBridge.exposeInMainWorld('env', {
  NODE_ENV: process.env.NODE_ENV || 'production',
  IS_ELECTRON: true
});
