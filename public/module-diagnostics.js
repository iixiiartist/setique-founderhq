/**
 * Production Error Diagnostics
 * 
 * Add this script tag to index.html BEFORE other scripts to catch
 * module initialization errors early.
 */

(function() {
  'use strict';
  
  // Track module loading order and errors
  window.__MODULE_LOAD_DEBUG__ = {
    loaded: [],
    errors: [],
    startTime: Date.now()
  };
  
  // Intercept module errors before they crash the app
  window.addEventListener('error', function(event) {
    const error = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: Date.now() - window.__MODULE_LOAD_DEBUG__.startTime,
      stack: event.error ? event.error.stack : null
    };
    
    window.__MODULE_LOAD_DEBUG__.errors.push(error);
    
    // Check if it's the lucide-react initialization error
    if (error.message && error.message.includes('Cannot set properties of undefined')) {
      console.error('🔴 MODULE INITIALIZATION ERROR DETECTED:', error);
      console.error('📦 Loaded modules so far:', window.__MODULE_LOAD_DEBUG__.loaded);
      console.error('⏱️ Error occurred', error.timestamp, 'ms after page load');
      
      // Try to identify which chunk failed
      if (error.filename) {
        const chunkName = error.filename.match(/([^/]+)\.js$/);
        if (chunkName) {
          console.error('💥 Failed chunk:', chunkName[1]);
        }
      }
      
      // Show user-friendly error instead of blank screen
      document.body.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5; font-family: system-ui, -apple-system, sans-serif; padding: 20px;">
          <div style="max-width: 600px; background: white; border: 4px solid #000; padding: 40px; box-shadow: 8px 8px 0 rgba(0,0,0,0.1);">
            <h1 style="font-size: 2rem; margin: 0 0 20px 0;">⚠️ Loading Error</h1>
            <p style="margin: 0 0 20px 0; line-height: 1.6;">
              The application failed to initialize. This is a temporary issue that's being resolved.
            </p>
            <details style="margin: 20px 0; padding: 15px; background: #f9f9f9; border: 2px solid #ddd;">
              <summary style="cursor: pointer; font-weight: bold; margin-bottom: 10px;">Technical Details</summary>
              <pre style="margin: 10px 0 0 0; overflow-x: auto; font-size: 12px; line-height: 1.4;">Error: ${error.message}
File: ${error.filename}
Line: ${error.lineno}:${error.colno}
Time: ${error.timestamp}ms after load

Loaded Modules:
${window.__MODULE_LOAD_DEBUG__.loaded.join('\n')}</pre>
            </details>
            <div style="display: flex; gap: 10px; margin-top: 30px;">
              <button onclick="location.reload()" style="flex: 1; padding: 12px 24px; background: #000; color: white; border: 2px solid #000; font-weight: bold; cursor: pointer; font-size: 14px;">
                Reload Page
              </button>
              <button onclick="localStorage.clear(); location.reload()" style="flex: 1; padding: 12px 24px; background: yellow; color: black; border: 2px solid #000; font-weight: bold; cursor: pointer; font-size: 14px;">
                Clear Cache & Reload
              </button>
            </div>
            <p style="margin: 20px 0 0 0; font-size: 12px; color: #666;">
              Error ID: ${Date.now()}<br>
              If this persists, please contact support with the Error ID.
            </p>
          </div>
        </div>
      `;
      
      // Prevent default error handling
      event.preventDefault();
      return false;
    }
  });
  
  // Track script loads
  const originalAddEventListener = HTMLScriptElement.prototype.addEventListener;
  HTMLScriptElement.prototype.addEventListener = function(type, listener, ...rest) {
    if (type === 'load') {
      const scriptSrc = this.src || this.getAttribute('src') || 'inline';
      window.__MODULE_LOAD_DEBUG__.loaded.push({
        src: scriptSrc,
        time: Date.now() - window.__MODULE_LOAD_DEBUG__.startTime
      });
    }
    return originalAddEventListener.call(this, type, listener, ...rest);
  };
  
  console.log('🔍 Module loading diagnostics enabled');
})();
