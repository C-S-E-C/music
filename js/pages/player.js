let playerSyncTimer = null;

function miniPlayer() {
    return top.document.getElementById('player');
}

function setMiniPlayerHidden(hidden) {
    const player = miniPlayer();
    if (player) {
        player.classList.toggle('mini-player-hidden', hidden);
    }
}

function largePlayerApi() {
    return top.playerAPI || null;
}

function playerElement(id) {
    return document.getElementById(id);
}

function parseTime(value) {
    const parts = String(value || '0').split(':').map(Number);
    if (parts.some(Number.isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
}

function syncLargePlayer() {
    const api = largePlayerApi();
    const title = playerElement('large-title');
    const artist = playerElement('large-artist');
    const cover = playerElement('large-cover');
    const current = playerElement('large-current');
    const duration = playerElement('large-duration');
    const bar = playerElement('large-bar');
    const playIcon = playerElement('large-play-icon');
    const pauseIcon = playerElement('large-pause-icon');

    if (!api || !api.song) {
        title.textContent = 'Nothing playing';
        artist.textContent = 'Choose a song to start playback.';
        cover.style.backgroundImage = 'url("/imgs/default-cover.png")';
        current.textContent = '00:00.0';
        duration.textContent = '00:00.0';
        bar.style.width = '0%';
        playIcon.style.opacity = '1';
        pauseIcon.style.opacity = '0';
        return;
    }

    title.textContent = api.song.title || 'Untitled';
    artist.textContent = api.song.artist || 'Unknown artist';
    artist.href = "#";
    if (api.song.artist) {
        artist.href = "search.html?key="+ (encodeURIComponent(api.song.artist));
    }
    cover.style.backgroundImage = api.e.info.cover.style.backgroundImage || 'url("/imgs/default-cover.png")';

    const currentTime = api.song.currentTime || '00:00.0';
    const totalTime = api.song.duration || '00:00.0';
    current.textContent = currentTime;
    duration.textContent = totalTime;

    const totalSeconds = parseTime(totalTime);
    const currentSeconds = parseTime(currentTime);
    bar.style.width = totalSeconds > 0 ? `${Math.min(100, (currentSeconds / totalSeconds) * 100)}%` : '0%';

    const isPlaying = api.status === 'playing';
    playIcon.style.opacity = isPlaying ? '0' : '1';
    pauseIcon.style.opacity = isPlaying ? '1' : '0';
}

function bindLargeControls() {
    playerElement('large-cover').addEventListener('click', () => largePlayerApi()?.play());
    playerElement('large-play').addEventListener('click', () => largePlayerApi()?.play());
    playerElement('large-prev').addEventListener('click', () => largePlayerApi()?.changeSong(-1));
    playerElement('large-next').addEventListener('click', () => largePlayerApi()?.changeSong(1));
}

document.addEventListener('DOMContentLoaded', () => {
    setMiniPlayerHidden(true);
    bindLargeControls();
    syncLargePlayer();
    playerSyncTimer = setInterval(syncLargePlayer, 150);
});

window.addEventListener('pagehide', () => {
    setMiniPlayerHidden(false);
    if (playerSyncTimer) {
        clearInterval(playerSyncTimer);
    }
});
