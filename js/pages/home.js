async function loading() {
    // Polling safety: wait until api object and user properties exist
    if (typeof api === 'undefined' || !api.me) {
        setTimeout(loading, 200);
        return;
    }

    const loadingEl = document.getElementById("loading");

    // Scenario A: User is not in beta (Fade out loader overlay immediately)
    if (!api.me.is_beta || localStorage.getItem("settings.beta-loading-page") === "false") {
        hideLoader(loadingEl);
        return;
    }

    // Scenario B: Beta user (Trigger handwriting class)
    loadingEl.classList.add("animate-path");

    // Clean up loader layer after the 5s animation completes
    setTimeout(() => {
        hideLoader(loadingEl);
    }, 5000);
}

function hideLoader(element) {
    if (!element) return;
    element.classList.add("fade-out");
    
    // Completely remove element visibility from DOM flow after transitions complete
    setTimeout(() => {
        element.style.display = "none";
    }, 1000);
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    }[char]));
}

async function loadRecommendedSongs() {
    const section = document.querySelector('.recommendations');
    const track = document.getElementById('recommendation-track');
    if (!section || !track || typeof api === 'undefined') return;

    const songs = [];

    for (let id = 0; id < 15; id++) {
        try {
            const song = await api.getSongInfo(id);
            songs.push({ ...song, id });
        } catch (error) {
            if (error && error.status !== 404) {
                console.warn(`Failed to load recommendation song ${id}`, error);
            }
        }
    }

    if (!songs.length) {
        section.style.display = 'none';
        return;
    }

    const repeatedSongs = [];
    while (repeatedSongs.length < Math.max(16, songs.length * 2)) {
        repeatedSongs.push(...songs);
    }

    const cardMarkup = repeatedSongs.map((song) => {
        const title = escapeHtml(song.title || 'Untitled');
        const artist = escapeHtml(song.artist || 'Unknown artist');
        const cover = api.getSongCover(song.id);
        const href = `search.html?key=${encodeURIComponent(song.title || song.artist || song.id)}`;

        return `
            <a class="music-card" href="${href}">
                <span class="music-cover" style="background-image: url('${cover}'), url('/imgs/default-cover.png')"></span>
                <span class="music-title">${title}</span>
                <span class="music-artist">${artist}</span>
            </a>
        `;
    }).join('');

    track.innerHTML = `
        <div class="music-set">${cardMarkup}</div>
        <div class="music-set" aria-hidden="true">${cardMarkup}</div>
    `;
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    loading();
    loadRecommendedSongs();
});
