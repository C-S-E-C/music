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
    `;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadStyle();
    updateMe();
    setInterval(updateMe(), 30000);
});
