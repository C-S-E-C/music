let lyricsSyncTimer = null;
let loadedLyricsSongId = undefined;
let lyricLines = [];
let activeLyricIndex = -1;

function rootPlayer() {
    return top.playerAPI || null;
}

function rootApi() {
    return top.api || null;
}

function miniPlayer() {
    return top.document.getElementById('player');
}

function setMiniPlayerHidden(hidden) {
    const player = miniPlayer();
    if (player) {
        player.classList.toggle('mini-player-hidden', hidden);
    }
}

function el(id) {
    return document.getElementById(id);
}

function parseTime(value) {
    const parts = String(value || '0').split(':').map(Number);
    if (parts.some(Number.isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
}

function currentSeconds(api) {
    if (!api || !api.song) return 0;
    if (api.audio && typeof api.audio.currentTime === 'number') {
        return api.audio.currentTime + (Number(api.currentChunk || 0) * 5);
    }
    return parseTime(api.song.currentTime);
}

function parseLrc(text) {
    return String(text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
            const match = line.match(/^\[([\d:.]+)\]\s*(.*)$/);
            if (!match) return null;
            const parts = match[1].split(':');
            const secondsPart = parts.pop() || '0';
            const seconds = Number(secondsPart);
            const minutes = Number(parts.pop() || 0);
            const hours = Number(parts.pop() || 0);
            return {
                time: hours * 3600 + minutes * 60 + seconds,
                text: match[2] || ''
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.time - b.time);
}

function renderLyrics() {
    const target = el('lyrics-lines');
    if (!target) return;

    if (!lyricLines.length) {
        target.innerHTML = '<p class="lyrics-empty">No lyrics available.</p>';
        return;
    }

    target.innerHTML = lyricLines.map((line, index) => (
        `<p class="lyrics-line" data-lyric-index="${index}">${line.text || '&nbsp;'}</p>`
    )).join('');
}

async function loadLyricsForCurrentSong() {
    const api = rootPlayer();
    const songId = api?.song?.id ?? null;
    if (songId === loadedLyricsSongId) return;

    loadedLyricsSongId = songId;
    lyricLines = [];
    activeLyricIndex = -1;
    renderLyrics();

    let text = '';
    try {
        if (songId !== null && rootApi()) {
            text = await rootApi().getSongLyrics(songId);
        }
    } catch (error) {
        try {
            const response = await fetch('/lyrics.txt');
            text = await response.text();
        } catch (fallbackError) {
            text = '';
        }
    }

    lyricLines = parseLrc(text);
    renderLyrics();
}

function updateLyricHighlight(seconds) {
    if (!lyricLines.length) return;

    let activeIndex = 0;
    for (let i = 0; i < lyricLines.length; i++) {
        if (lyricLines[i].time <= seconds) {
            activeIndex = i;
        } else {
            break;
        }
    }

    if (activeIndex === activeLyricIndex) return;
    activeLyricIndex = activeIndex;

    document.querySelectorAll('.lyrics-line').forEach((line) => {
        line.classList.toggle('active', Number(line.dataset.lyricIndex) === activeIndex);
    });

    const active = document.querySelector('.lyrics-line.active');
    if (active) {
        active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

function syncLyricsPlayer() {
    const api = rootPlayer();
    const title = el('large-title');
    const artist = el('large-artist');
    const cover = el('medium-cover');
    const current = el('large-current');
    const duration = el('large-duration');
    const bar = el('large-bar');
    const playIcon = el('large-play-icon');
    const pauseIcon = el('large-pause-icon');

    if (!api || !api.song) {
        title.textContent = 'Nothing playing';
        artist.textContent = 'Choose a song to start playback.';
        artist.removeAttribute('href');
        cover.style.backgroundImage = 'url("/imgs/default-cover.png")';
        current.textContent = '00:00.0';
        duration.textContent = '00:00.0';
        bar.style.width = '0%';
        playIcon.style.opacity = '1';
        pauseIcon.style.opacity = '0';
        loadLyricsForCurrentSong();
        return;
    }

    title.textContent = api.song.title || 'Untitled';
    artist.textContent = api.song.artist || 'Unknown artist';
    artist.href = api.song.artist ? `search.html?key=${encodeURIComponent(api.song.artist)}` : '#';
    cover.style.backgroundImage = api.e.info.cover.style.backgroundImage || 'url("/imgs/default-cover.png")';

    const currentTime = api.song.currentTime || '00:00.0';
    const totalTime = api.song.duration || '00:00.0';
    current.textContent = currentTime;
    duration.textContent = totalTime;

    const total = parseTime(totalTime);
    const seconds = currentSeconds(api);
    bar.style.width = total > 0 ? `${Math.min(100, (seconds / total) * 100)}%` : '0%';

    const isPlaying = api.status === 'playing';
    playIcon.style.opacity = isPlaying ? '0' : '1';
    pauseIcon.style.opacity = isPlaying ? '1' : '0';

    loadLyricsForCurrentSong();
    updateLyricHighlight(seconds);
}

function bindLyricsControls() {
    el('medium-cover')?.addEventListener('click', () => rootPlayer()?.play());
    el('large-play')?.addEventListener('click', () => rootPlayer()?.play());
    el('large-prev')?.addEventListener('click', () => rootPlayer()?.changeSong(-1));
    el('large-next')?.addEventListener('click', () => rootPlayer()?.changeSong(1));
}

document.addEventListener('DOMContentLoaded', () => {
    setMiniPlayerHidden(true);
    bindLyricsControls();
    syncLyricsPlayer();
    lyricsSyncTimer = setInterval(syncLyricsPlayer, 150);
});

window.addEventListener('pagehide', () => {
    setMiniPlayerHidden(false);
    if (lyricsSyncTimer) {
        clearInterval(lyricsSyncTimer);
    }
});
