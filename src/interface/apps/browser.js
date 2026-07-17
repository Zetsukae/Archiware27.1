export const initBrowserWindow = (windowEl) => {
  if (!windowEl) return;
  const webview = windowEl.querySelector('.browser-webview');
  const urlBar = windowEl.querySelector('.browser-url-bar');

  if (webview && !webview.src) {
    webview.src = 'https://www.wikipedia.org';
  }

  if (urlBar) {
    urlBar.textContent = 'https://www.wikipedia.org';
  }
};
