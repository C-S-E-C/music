const DEFAULT_PRELOAD_CHUNKS = '2';
const DEFAULT_BETA_LOADING = true;

function settingElement(id) {
    return document.getElementById(id);
}

function loadStoredStyle() {
    const style = localStorage.getItem('style');
    const target = settingElement('style');
    if (style && target) {
        target.textContent = style;
    }
}

function loadSettings() {
    const apiUrl = settingElement('api-url');
    const preloadChunks = settingElement('preload-chunks');
    const betaLoadingPage = settingElement('beta-loading-page');

    apiUrl.value = localStorage.getItem('apiUrl') || '';
    preloadChunks.value = localStorage.getItem('settings.preloadChunkCount') || DEFAULT_PRELOAD_CHUNKS;
    betaLoadingPage.checked = localStorage.getItem('settings.beta-loading-page') !== 'false';
}

function setStatus(message) {
    const status = settingElement('settings-status');
    status.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
        status.textContent = '';
    }, 2500);
}

function saveSettings(event) {
    event.preventDefault();

    const apiUrl = settingElement('api-url').value.trim();
    const preloadChunks = settingElement('preload-chunks').value;
    const betaLoadingPage = settingElement('beta-loading-page').checked;

    if (apiUrl) {
        localStorage.setItem('apiUrl', apiUrl);
    } else {
        localStorage.removeItem('apiUrl');
    }

    localStorage.setItem('settings.preloadChunkCount', String(Math.max(0, Number(preloadChunks) || 0)));
    localStorage.setItem('settings.beta-loading-page', String(betaLoadingPage));
    setStatus('Settings saved.');
}

function resetSettings() {
    localStorage.removeItem('apiUrl');
    localStorage.setItem('settings.preloadChunkCount', DEFAULT_PRELOAD_CHUNKS);
    localStorage.setItem('settings.beta-loading-page', String(DEFAULT_BETA_LOADING));
    loadSettings();
    setStatus('Settings reset.');
}

document.addEventListener('DOMContentLoaded', () => {
    loadStoredStyle();
    loadSettings();
    settingElement('settings-form').addEventListener('submit', saveSettings);
    settingElement('reset-settings').addEventListener('click', resetSettings);
});
