function getSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('key') || '').trim();
}

function setMessage(title, detail) {
    const resultsEl = document.getElementById('results');
    if (!resultsEl) return;
    resultsEl.innerHTML = `
        <div class="message-state">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(detail)}</span>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    }[char]));
}

function normalizeTags(tag) {
    return String(tag || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .join(' / ');
}

function songDuration(song) {
    const chunks = Number(song.chunks || 0);
    if (!chunks) return '';
    const totalSeconds = chunks * 5;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function playSong(songId, songs) {
    const playlist = songs.map((song) => ({ id: song.id }));
    const cursor = Math.max(0, playlist.findIndex((song) => String(song.id) === String(songId)));

    top.sessionStorage.setItem('Playlist', JSON.stringify(playlist));
    top.sessionStorage.setItem('PlaylistCursor', String(cursor));

    if (top.playerAPI && typeof top.playerAPI.start === 'function') {
        top.playerAPI.start();
    }
}

function renderResults(songs) {
    const resultsEl = document.getElementById('results');
    const countEl = document.getElementById('results-count');
    if (!resultsEl) return;

    countEl.textContent = `${songs.length} result${songs.length === 1 ? '' : 's'}`;

    if (!songs.length) {
        setMessage('No songs found', 'Try another title, artist, album, or tag.');
        return;
    }

    resultsEl.innerHTML = songs.map((song) => {
        const title = escapeHtml(song.title || 'Untitled');
        const artist = escapeHtml(song.artist || 'Unknown artist');
        const album = escapeHtml(song.album || 'Unknown album');
        const tags = escapeHtml(normalizeTags(song.tag));
        const duration = escapeHtml(songDuration(song));
        const meta = [artist, album, duration].filter(Boolean).join(' - ');

        return `
            <article class="result-card">
                <div class="result-cover" style="background-image: url('${api.getSongCover(song.id)}'), url('/imgs/default-cover.png')"></div>
                <div class="result-main">
                    <div class="result-title">${title}</div>
                    <div class="result-meta">${escapeHtml(meta)}</div>
                    <div class="result-tags">${tags || '&nbsp;'}</div>
                </div>
                <button class="play-result" type="button" data-song-id="${escapeHtml(song.id)}" aria-label="Play ${title}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6L18.8 12 8 5.2Z"/></svg>
                </button>
            </article>
        `;
    }).join('');

    resultsEl.querySelectorAll('.play-result').forEach((button) => {
        button.addEventListener('click', () => playSong(button.dataset.songId, songs));
    });
}

async function search() {
    const query = getSearchQuery();
    const input = document.getElementById('search-input');
    const titleEl = document.getElementById('results-title');
    const countEl = document.getElementById('results-count');

    if (input) input.value = query;
    if (titleEl) titleEl.textContent = query ? `Results for "${query}"` : 'Search';
    if (countEl) countEl.textContent = '';

    if (!query) {
        setMessage('Start with a search', 'Enter a song, artist, album, or tag.');
        return;
    }

    setMessage('Searching', 'Loading matching songs.');

    try {
        const results = await api.searchSongs(query);
        renderResults(Array.isArray(results) ? results : []);
    } catch (error) {
        console.error(error);
        setMessage('Search failed', error.message || 'The server did not return results.');
    }
}

document.addEventListener('DOMContentLoaded', search);
