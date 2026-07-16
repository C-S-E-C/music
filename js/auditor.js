let currentReviewToken = null;
let currentAuditSongs = [];
const auditPreview = {
    audio: new Audio(),
    songId: null,
    chunk: 0,
    chunks: 0,
    status: 'idle',
    objectUrl: null,
    timer: null
};

function escapeAuditHtml(value) {
    return String(value || '').replace(/[&<>"]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    }[char]));
}

function auditStatus(message, type = '') {
    const status = document.getElementById('auditor-status');
    if (!status) return;
    status.textContent = message;
    status.className = `history-status ${type}`.trim();
}

function formatAuditDuration(song) {
    const chunks = Number(song.chunks || 0);
    if (!chunks) return 'Unknown length';
    const seconds = chunks * 5;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatAuditTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00.0';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(1);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(4, '0')}`;
}

function parseAuditLyrics(text) {
    const lrcLines = String(text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const match = line.match(/^\[([\d:.]+)\]\s*(.*)$/);
            return match ? (match[2] || '') : line;
        })
        .filter(Boolean);

    return lrcLines.length ? lrcLines : ['No lyrics available.'];
}

function renderAudits(songs) {
    const list = document.getElementById('auditor-list');
    if (!list) return;

    if (!songs.length) {
        list.innerHTML = '';
        auditStatus('No songs are pending approval.');
        return;
    }

    auditStatus(`${songs.length} song${songs.length === 1 ? '' : 's'} locked for review.`);
    list.innerHTML = songs.map((song) => {
        const title = escapeAuditHtml(song.title || 'Untitled');
        const artist = escapeAuditHtml(song.artist || 'Unknown artist');
        const album = escapeAuditHtml(song.album || 'Unknown album');
        const tags = escapeAuditHtml(String(song.tag || '').split(',').filter(Boolean).join(' / '));
        const created = escapeAuditHtml(song.created_at || 'Unknown date');

        return `
            <article class="auditor-card" data-song-id="${escapeAuditHtml(song.id)}">
                <div class="auditor-cover" style="background-image: url('${api.getSongCover(song.id)}'), url('/imgs/default-cover.png')"></div>
                <div class="auditor-main">
                    <div class="history-title">${title}</div>
                    <div class="history-meta">${artist} - ${album}</div>
                    <div class="history-detail">${formatAuditDuration(song)} - ${created}${tags ? ` - ${tags}` : ''}</div>
                    <div class="audit-preview">
                        <div class="audit-player">
                            <button class="audit-play" type="button" data-song-id="${escapeAuditHtml(song.id)}" data-chunks="${escapeAuditHtml(song.chunks)}">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M8 5.2c0-.8.8-1.3 1.5-.9l9.7 5.8c.7.4.7 1.4 0 1.8l-9.7 5.8c-.7.4-1.5-.1-1.5-.9V5.2z"/>
                                </svg>
                                <span>Play</span>
                            </button>
                            <span class="audit-time" data-song-id="${escapeAuditHtml(song.id)}" data-total="${escapeAuditHtml(formatAuditDuration(song))}">00:00.0 / ${formatAuditDuration(song)}</span>
                            <div class="audit-progress" aria-hidden="true">
                                <div class="audit-progress-bar" data-song-id="${escapeAuditHtml(song.id)}"></div>
                            </div>
                        </div>
                        <div class="audit-lyrics-wrap">
                            <button class="audit-lyrics-toggle" type="button" data-song-id="${escapeAuditHtml(song.id)}">Lyrics</button>
                            <div class="audit-lyrics" data-song-id="${escapeAuditHtml(song.id)}" hidden></div>
                        </div>
                    </div>
                </div>
                <div class="auditor-actions">
                    <button class="audit-approve" type="button" data-song-id="${escapeAuditHtml(song.id)}">Approve</button>
                    <button class="audit-reject" type="button" data-song-id="${escapeAuditHtml(song.id)}">Reject</button>
                </div>
            </article>
        `;
    }).join('');

    list.querySelectorAll('.audit-approve').forEach((button) => {
        button.addEventListener('click', () => reviewSong(button.dataset.songId, 'approve'));
    });
    list.querySelectorAll('.audit-reject').forEach((button) => {
        button.addEventListener('click', () => reviewSong(button.dataset.songId, 'reject'));
    });
    list.querySelectorAll('.audit-play').forEach((button) => {
        button.addEventListener('click', () => toggleAuditPreview(button.dataset.songId, Number(button.dataset.chunks || 0)));
    });
    list.querySelectorAll('.audit-lyrics-toggle').forEach((button) => {
        button.addEventListener('click', () => toggleAuditLyrics(button.dataset.songId));
    });
}

function resetAuditPreviewUi() {
    document.querySelectorAll('.audit-play').forEach((button) => {
        button.classList.remove('playing');
        button.querySelector('span').textContent = 'Play';
    });
    document.querySelectorAll('.audit-progress-bar').forEach((bar) => {
        bar.style.width = '0%';
    });
    document.querySelectorAll('.audit-time').forEach((time) => {
        time.textContent = `00:00.0 / ${time.dataset.total || '00:00.0'}`;
    });
}

function updateAuditPreviewUi() {
    if (!auditPreview.songId) return;

    const elapsed = auditPreview.chunk * 5 + auditPreview.audio.currentTime;
    const total = auditPreview.chunks * 5;
    const time = document.querySelector(`.audit-time[data-song-id="${CSS.escape(String(auditPreview.songId))}"]`);
    const bar = document.querySelector(`.audit-progress-bar[data-song-id="${CSS.escape(String(auditPreview.songId))}"]`);

    if (time) {
        time.textContent = `${formatAuditTime(elapsed)} / ${formatAuditTime(total)}`;
    }
    if (bar) {
        bar.style.width = total > 0 ? `${Math.min(100, (elapsed / total) * 100)}%` : '0%';
    }
}

function stopAuditPreview() {
    auditPreview.audio.pause();
    auditPreview.audio.removeAttribute('src');
    auditPreview.audio.load();
    if (auditPreview.objectUrl) {
        URL.revokeObjectURL(auditPreview.objectUrl);
        auditPreview.objectUrl = null;
    }
    if (auditPreview.timer) {
        clearInterval(auditPreview.timer);
        auditPreview.timer = null;
    }
    auditPreview.songId = null;
    auditPreview.chunk = 0;
    auditPreview.chunks = 0;
    auditPreview.status = 'idle';
    resetAuditPreviewUi();
}

async function loadAuditPreviewChunk(songId, chunk) {
    const response = await api.getSongChunk(songId, chunk, currentReviewToken);
    const blob = await response.blob();
    if (auditPreview.objectUrl) {
        URL.revokeObjectURL(auditPreview.objectUrl);
    }
    auditPreview.objectUrl = URL.createObjectURL(blob);
    auditPreview.audio.src = auditPreview.objectUrl;
    auditPreview.audio.load();
}

async function playAuditPreview(songId, chunks) {
    if (!currentReviewToken) {
        auditStatus('Review token is missing. Refresh the queue and try again.', 'error');
        return;
    }

    stopAuditPreview();
    auditPreview.songId = songId;
    auditPreview.chunk = 0;
    auditPreview.chunks = chunks;
    auditPreview.status = 'loading';

    const button = document.querySelector(`.audit-play[data-song-id="${CSS.escape(String(songId))}"]`);
    if (button) {
        button.querySelector('span').textContent = 'Loading';
    }

    try {
        await loadAuditPreviewChunk(songId, 0);
        auditPreview.status = 'playing';
        if (button) {
            button.classList.add('playing');
            button.querySelector('span').textContent = 'Pause';
        }
        await auditPreview.audio.play();
        auditPreview.timer = setInterval(updateAuditPreviewUi, 100);
    } catch (error) {
        stopAuditPreview();
        auditStatus(error.message || 'Failed to preview song.', 'error');
    }
}

function toggleAuditPreview(songId, chunks) {
    if (String(auditPreview.songId) === String(songId) && auditPreview.status === 'playing') {
        stopAuditPreview();
        return;
    }
    playAuditPreview(songId, chunks);
}

async function toggleAuditLyrics(songId) {
    const lyrics = document.querySelector(`.audit-lyrics[data-song-id="${CSS.escape(String(songId))}"]`);
    if (!lyrics) return;

    if (!lyrics.hidden) {
        lyrics.hidden = true;
        return;
    }

    lyrics.hidden = false;
    if (lyrics.dataset.loaded === 'true') return;

    lyrics.textContent = 'Loading lyrics.';
    try {
        const text = await api.getSongLyrics(songId, currentReviewToken);
        lyrics.innerHTML = parseAuditLyrics(text)
            .map((line) => `<p>${escapeAuditHtml(line)}</p>`)
            .join('');
        lyrics.dataset.loaded = 'true';
    } catch (error) {
        lyrics.innerHTML = '<p>No lyrics available.</p>';
        lyrics.dataset.loaded = 'true';
    }
}

function removeReviewedSong(songId) {
    if (String(auditPreview.songId) === String(songId)) {
        stopAuditPreview();
    }
    currentAuditSongs = currentAuditSongs.filter((song) => String(song.id) !== String(songId));
    renderAudits(currentAuditSongs);
}

async function reviewSong(songId, action) {
    if (!currentReviewToken) {
        auditStatus('Review token is missing. Refresh the queue and try again.', 'error');
        return;
    }

    const buttons = document.querySelectorAll(`[data-song-id="${CSS.escape(String(songId))}"] button`);
    buttons.forEach((button) => {
        button.disabled = true;
    });

    try {
        if (action === 'approve') {
            await api.approveSong(songId, currentReviewToken);
            auditStatus(`Approved song #${songId}.`, 'success');
        } else {
            await api.rejectSong(songId, currentReviewToken);
            auditStatus(`Rejected song #${songId}.`, 'success');
        }
        removeReviewedSong(songId);
    } catch (error) {
        auditStatus(error.message || `Failed to ${action} song.`, 'error');
        buttons.forEach((button) => {
            button.disabled = false;
        });
    }
}

async function loadAudits() {
    const refresh = document.getElementById('refresh-audits');
    if (refresh) refresh.disabled = true;
    auditStatus('Loading pending songs.');
    stopAuditPreview();

    try {
        const result = await api.getPendingApproval();
        currentReviewToken = result.token || null;
        currentAuditSongs = Array.isArray(result.songs) ? result.songs : [];
        renderAudits(currentAuditSongs);
    } catch (error) {
        currentReviewToken = null;
        currentAuditSongs = [];
        renderAudits([]);
        auditStatus(error.status === 403 ? 'Auditor access is required.' : (error.message || 'Failed to load pending songs.'), 'error');
    } finally {
        if (refresh) refresh.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const refresh = document.getElementById('refresh-audits');
    if (refresh) {
        refresh.addEventListener('click', loadAudits);
    }
    loadAudits();
});

auditPreview.audio.addEventListener('ended', async () => {
    if (!auditPreview.songId || auditPreview.status !== 'playing') return;

    auditPreview.chunk++;
    if (auditPreview.chunk >= auditPreview.chunks) {
        stopAuditPreview();
        return;
    }

    try {
        await loadAuditPreviewChunk(auditPreview.songId, auditPreview.chunk);
        await auditPreview.audio.play();
    } catch (error) {
        stopAuditPreview();
        auditStatus(error.message || 'Failed to load next preview chunk.', 'error');
    }
});
