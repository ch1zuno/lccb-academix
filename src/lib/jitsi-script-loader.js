let scriptPromise = null;

/**
 * Dynamically loads the Jitsi Meet external API script once.
 * SSR-safe: returns a rejected promise if executed in non-browser context.
 *
 * @param {string} [domain='meet.jit.si'] Bare hostname of the Jitsi deployment
 * @returns {Promise<any>} Resolves with window.JitsiMeetExternalAPI
 */
export function loadJitsiScript(domain = 'meet.jit.si') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Jitsi Meet script can only be loaded in a browser environment'));
  }

  // Already loaded in global window
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve(window.JitsiMeetExternalAPI);
  }

  // Return existing in-flight promise to avoid duplicate <script> tags
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    // Check if script element was previously injected
    const scriptUrl = `https://${domain}/external_api.js`;
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

    if (existingScript) {
      if (window.JitsiMeetExternalAPI) {
        resolve(window.JitsiMeetExternalAPI);
        return;
      }
      existingScript.addEventListener('load', () => resolve(window.JitsiMeetExternalAPI));
      existingScript.addEventListener('error', () => {
        scriptPromise = null;
        reject(new Error(`Failed to load Jitsi Meet script from ${scriptUrl}`));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      if (window.JitsiMeetExternalAPI) {
        resolve(window.JitsiMeetExternalAPI);
      } else {
        scriptPromise = null;
        script.remove();
        reject(new Error('JitsiMeetExternalAPI was not found on window after script load'));
      }
    };

    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error(`Failed to load Jitsi Meet API from ${scriptUrl}. Check network or ad-blockers.`));
    };

    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Reset script loader state (used for testing or explicit retry).
 */
export function _resetScriptLoader() {
  scriptPromise = null;
}

