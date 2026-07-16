const DEFAULT_PRELOAD_CHUNKS = '2';
const DEFAULT_NEXT_CHUNK_LEAD_MS = '75';
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
    const nextChunkLeadMs = settingElement('next-chunk-lead-ms');
    const betaLoadingPage = settingElement('beta-loading-page');

    apiUrl.value = localStorage.getItem('apiUrl') || '';
    preloadChunks.value = localStorage.getItem('settings.preloadChunkCount') || DEFAULT_PRELOAD_CHUNKS;
    nextChunkLeadMs.value = localStorage.getItem('settings.nextChunkLeadMs') || DEFAULT_NEXT_CHUNK_LEAD_MS;
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
    const nextChunkLeadMs = settingElement('next-chunk-lead-ms').value;
    const betaLoadingPage = settingElement('beta-loading-page').checked;

    if (apiUrl) {
        localStorage.setItem('apiUrl', apiUrl);
    } else {
        localStorage.removeItem('apiUrl');
    }

    localStorage.setItem('settings.preloadChunkCount', String(Math.max(0, Number(preloadChunks) || 0)));
    localStorage.setItem('settings.nextChunkLeadMs', String(Math.max(0, Number(nextChunkLeadMs) || 0)));
    localStorage.setItem('settings.beta-loading-page', String(betaLoadingPage));
    setStatus('Settings saved.');
}

function resetSettings() {
    localStorage.removeItem('apiUrl');
    localStorage.setItem('settings.preloadChunkCount', DEFAULT_PRELOAD_CHUNKS);
    localStorage.setItem('settings.nextChunkLeadMs', DEFAULT_NEXT_CHUNK_LEAD_MS);
    localStorage.setItem('settings.beta-loading-page', String(DEFAULT_BETA_LOADING));
    loadSettings();
    setStatus('Settings reset.');
}

function selectCategory(category) {
    document.querySelectorAll('.settings-category').forEach((button) => {
        const isActive = button.dataset.category === category;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });

    document.querySelectorAll('.settings-section').forEach((section) => {
        section.hidden = category !== 'all' && section.dataset.category !== category;
    });
}

function bindCategories() {
    document.querySelectorAll('.settings-category').forEach((button) => {
        button.addEventListener('click', () => {
            selectCategory(button.dataset.category || 'all');
        });
    });
}

function loadBeta(){
    if (!api.me) {
        setTimeout(()=>{loadBeta()}, 1000);
        return;
    }
    if (api.me.is_beta) {
        const elements = document.querySelectorAll('[betaNeeded]');
        elements.forEach((element) => {
            element.hidden = false;
        })
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('[betaNeeded]');
    elements.forEach((element) => {
        element.hidden = true;
    })
    loadBeta();
    loadStoredStyle();
    loadSettings();
    bindCategories();
    settingElement('settings-form').addEventListener('submit', saveSettings);
    settingElement('reset-settings').addEventListener('click', resetSettings);
});
