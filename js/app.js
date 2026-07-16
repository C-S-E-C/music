// Current song state
let currentSongId = null;
let currentChunk = 0;
let totalChunks = 0;

function formatTime(totalSeconds) {
    if (totalSeconds <= 0) {
        return "00:00";
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = (totalSeconds % 60).toFixed(0);
    if (hours > 0) {
        return String(hours).padStart(1, "0") + ":" + 
               String(minutes).padStart(2, "0") + ":" + 
               String(seconds).padStart(2, "0");
    }
    return String(minutes).padStart(2, "0") + ":" + 
           String(seconds).padStart(2, "0");
}

async function loadStyle() {
    if (localStorage.getItem('style')){
        document.getElementById('style').innerHTML = localStorage.getItem('style');
    } else {
        const response = await fetch('/css/defult.style.css');
        const style = await response.text();
        document.getElementById('style').innerHTML = style;
        localStorage.setItem('style', style);
    }
}

function updateMe() {
    if (top !== self) return;
    
    if (!api || !api.me) {
        updateMeTimer = setTimeout(updateMe, 1000); 
        return;
    }
    
    const info = document.querySelector('#me-wrapper #me');
    if (!info) return;

    // Format last fetch time
    let fetchTime = 'Unknown';
    if (api.me.last_fetch) {
        try {
            const date = new Date(api.me.last_fetch);
            fetchTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch (e) {
            fetchTime = api.me.last_fetch;
        }
    }

    // Build role badges conditionally
    let badges = [];
    if (api.me.is_auditor === 1 || api.me.is_auditor === true) {
        badges.push('<a class="role-badge auditor-badge" href="/auditor/index.html">#Auditor</a>');
    }
    if (api.me.is_beta === 1 || api.me.is_beta === true) {
        badges.push('<span class="role-badge">#Beta</span>');
    }
    const badgeText = badges.length > 0 ? ` ${badges.join(' ')}` : '';

    info.innerHTML = `
        <span id="username">${api.me.username}</span>
        <span id="id">#${api.me.id}${badgeText}</span>
        <span id="email">${api.me.email}</span>
        <span id="timeleft">Timeleft: ${formatTime(api.me.timeleft * 5)}</span>
        <span id="created">Joined: ${api.me.created_at ? api.me.created_at.split(' ')[0] : 'N/A'}</span>
        <span id="lastfetch">Last fetched at: ${fetchTime}</span>
        <hr>
        <span id="settings" class="me-menu-action" role="button" tabindex="0" onclick="window.location.href='settings.html'">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1c-.8-.6-1.6-1-2.6-1.3L14 2.6h-4l-.4 2.6c-1 .3-1.8.7-2.6 1.3l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1c.8.6 1.6 1 2.6 1.3l.4 2.6h4l.4-2.6c1-.3 1.8-.7 2.6-1.3l2.4 1 2-3.5-2-1.5zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"/>
            </svg>
            <span>Settings</span>
        </span>
        <hr>
        <span id="logout" class="me-menu-action" role="button" tabindex="0" onclick="logout()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 3.5h7.2c.6 0 1 .4 1 1v3h-2v-2H6v13h5.2v-2h2v3c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1v-15c0-.6.4-1 1-1zm11.3 4.3 4.2 4.2-4.2 4.2-1.4-1.4 1.8-1.8H9v-2h7.7l-1.8-1.8 1.4-1.4z"/>
            </svg>
            <span>Logout</span>
        </span>
    `;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadStyle();
    updateMe();
    setInterval(updateMe(), 10000);
});
