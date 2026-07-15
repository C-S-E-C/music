let currentReviewToken = null;
let currentAuditSongs = [];

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
}

function removeReviewedSong(songId) {
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
