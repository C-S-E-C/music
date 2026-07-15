function escapeCreatorHtml(value) {
    return String(value || '').replace(/[&<>"]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    }[char]));
}

function approvalLabel(song) {
    if (song.approved === 1) return 'Approved';
    if (song.approved === -1) return 'Rejected';
    return 'Pending';
}

function approvalClass(song) {
    if (song.approved === 1) return 'approved';
    if (song.approved === -1) return 'rejected';
    return 'pending';
}

function formatSongDate(value) {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function renderHistory(songs) {
    const status = document.getElementById('history-status');
    const list = document.getElementById('history-list');
    if (!status || !list) return;

    if (!songs.length) {
        status.textContent = 'No uploads yet.';
        list.innerHTML = '';
        return;
    }

    status.textContent = `${songs.length} upload${songs.length === 1 ? '' : 's'}`;
    list.innerHTML = songs.map((song) => {
        const title = escapeCreatorHtml(song.title || 'Untitled');
        const artist = escapeCreatorHtml(song.artist || 'Unknown artist');
        const album = escapeCreatorHtml(song.album || 'Unknown album');
        const tags = escapeCreatorHtml(String(song.tag || '').split(',').filter(Boolean).join(' / '));
        const chunks = Number(song.chunks || 0);
        const duration = chunks ? `${Math.floor(chunks * 5 / 60)}:${String((chunks * 5) % 60).padStart(2, '0')}` : 'Unknown length';
        const statusText = approvalLabel(song);
        const statusClass = approvalClass(song);

        return `
            <article class="history-card">
                <div class="history-cover" style="background-image: url('${api.getSongCover(song.id)}'), url('/imgs/default-cover.png')"></div>
                <div class="history-main">
                    <div class="history-title">${title}</div>
                    <div class="history-meta">${artist} - ${album}</div>
                    <div class="history-detail">${duration} - ${formatSongDate(song.created_at)}${tags ? ` - ${tags}` : ''}</div>
                </div>
                <span class="history-badge ${statusClass}">${statusText}</span>
            </article>
        `;
    }).join('');
}

async function loadHistory() {
    const status = document.getElementById('history-status');
    try {
        const songs = await api.getMySongs();
        renderHistory(Array.isArray(songs) ? songs : []);
    } catch (error) {
        if (status) {
            status.textContent = error.message || 'Failed to load uploads.';
        }
    }
}

document.addEventListener('DOMContentLoaded', loadHistory);
