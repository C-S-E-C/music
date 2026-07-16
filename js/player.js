class player {
    constructor() {
        if (!sessionStorage.getItem('Playlist')) {
            sessionStorage.setItem('Playlist', JSON.stringify([]));
            sessionStorage.setItem('PlaylistCursor', '0');
        }
        this.status = 'loading';
        this.e = {};
        this.e.player = document.getElementById('player');
        if (!this.e.player) {
            console.error('Player element not found');
            return;
        }
        this.audioA = this.e.player.querySelector('#audioA');
        this.audioB = this.e.player.querySelector('#audioB');
        this.audioA.preload = 'auto';
        this.audioB.preload = 'auto';
        this.e.info = {};
        this.e.info.title = this.e.player.querySelector('#title');
        this.e.info.artist = this.e.player.querySelector('#artist');
        this.e.info.cover = this.e.player.querySelector('#cover');
        this.e.progress = {};
        this.e.progress.bar = this.e.player.querySelector('#bar');
        this.e.progress.time = this.e.player.querySelector('#time');
        this.e.controls = {};
        this.e.controls.prev = this.e.player.querySelector('#prev');
        this.e.controls.play = this.e.player.querySelector('#play');
        this.e.controls.playbtn = this.e.player.querySelector('#play-btn');
        this.e.controls.pausebtn = this.e.player.querySelector('#pause-btn');
        this.e.controls.next = this.e.player.querySelector('#next');
        this.audio = this.audioA;
        this.preloadedChunks = [];
        this.nextChunkReady = false;
        this.isPreloading = false;
        this.isChangingChunk = false;
        this.nextChunkLeadMs = 0;
        this.lastRenderedTimeText = '';
        this.lastRenderedBarWidth = '';
        this.lastPlayedPositionSeconds = null;
        this.boundProgressSyncLoop = this.progressSyncLoop.bind(this);
        this.workerInterval = setInterval(this.workerIntervalFunc.bind(this), 100);
        this.progressAnimationFrame = requestAnimationFrame(this.boundProgressSyncLoop);
        this.e.controls.prev.addEventListener('click', () => {
            this.changeSong(-1);
        })
        this.e.controls.play.addEventListener('click', () => {
            this.play();
        })
        this.e.controls.next.addEventListener('click', () => {
            this.changeSong(1);
        })
        this.audioA.addEventListener('ended', () => {
            this.handleChunkTransition();
        });
        this.audioB.addEventListener('ended', () => {
            this.handleChunkTransition();
        });
    }

    getPlaylist() {
        return { songs: JSON.parse(sessionStorage.getItem('Playlist')), cursor: parseInt(sessionStorage.getItem('PlaylistCursor')) };
    }

    formatTime(totalSeconds) {
        if (totalSeconds <= 0) {
            return "00:00";
        }
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = (totalSeconds % 60).toFixed(1);
        if (hours > 0) {
            return String(hours).padStart(1, "0") + ":" + 
                   String(minutes).padStart(2, "0") + ":" + 
                   String(seconds).padStart(4, "0");
        }
        return String(minutes).padStart(2, "0") + ":" + 
               String(seconds).padStart(4, "0");
    }

    setPlayButtonState(isPlaying) {
        this.e.controls.playbtn.style.opacity = isPlaying ? '0' : '1';
        this.e.controls.pausebtn.style.opacity = isPlaying ? '1' : '0';
    }

    renderProgress(force = false) {
        if (!this.song || !this.audio) {
            return;
        }

        const elapsed = this.audio.currentTime + this.currentChunk * 5;
        this.song.currentTime = this.formatTime(elapsed);

        const timeText = `${this.song.currentTime} / ${this.song.duration}`;
        if (force || timeText !== this.lastRenderedTimeText) {
            this.e.progress.time.innerText = timeText;
            this.lastRenderedTimeText = timeText;
        }

        const totalSeconds = this.song.chunks * 5;
        const width = totalSeconds > 0 ? `${Math.min(100, (elapsed / totalSeconds) * 100).toFixed(3)}%` : '0%';
        if (force || width !== this.lastRenderedBarWidth) {
            this.e.progress.bar.style.width = width;
            this.lastRenderedBarWidth = width;
        }
    }

    playedPositionSeconds() {
        if (!this.song || !this.audio) {
            return null;
        }
        return this.currentChunk * 5 + this.audio.currentTime;
    }

    resetPlayedSecondsTracking() {
        this.lastPlayedPositionSeconds = null;
    }

    updatePlayedSecondsAfterLastUpdate() {
        if (typeof api === 'undefined' || typeof api.PlayedSecondsAfterLastUpdate !== 'number') {
            return;
        }
        if (this.status !== 'playing' || !this.audio || this.audio.paused || this.audio.ended) {
            this.resetPlayedSecondsTracking();
            return;
        }

        const position = this.playedPositionSeconds();
        if (position === null) {
            this.resetPlayedSecondsTracking();
            return;
        }

        if (this.lastPlayedPositionSeconds === null) {
            this.lastPlayedPositionSeconds = position;
            return;
        }

        const delta = position - this.lastPlayedPositionSeconds;
        this.lastPlayedPositionSeconds = position;

        if (delta > 0) {
            api.PlayedSecondsAfterLastUpdate += delta;
        }
    }

    progressSyncLoop() {
        this.renderProgress();
        this.updatePlayedSecondsAfterLastUpdate();
        if (this.shouldSwitchToNextChunk()) {
            this.handleChunkTransition();
        }
        this.progressAnimationFrame = requestAnimationFrame(this.boundProgressSyncLoop);
    }

    play() {
        // If nothing has been started yet (or the last song ended), (re)start playback
        // instead of silently doing nothing.
        if (this.status === 'idle' || this.status === 'loading') {
            this.setPlayButtonState(true);
            if (this.song) {
                this.status = 'playing';
            } else {
                this.start();
            }
            return;
        }
        if (this.status == 'playing') {
            this.setPlayButtonState(false);
            this.status = 'paused';
            this.resetPlayedSecondsTracking();
        }
        else if (this.status == 'paused') {
            this.setPlayButtonState(true);
            this.status = 'playing';
            this.resetPlayedSecondsTracking();
        }
    }

    async renderSong() {
        this.e.progress.bar.style.transition = "width 0.75s ease-out";
        this.e.progress.bar.style.width = "0%";
        await new Promise(resolve => setTimeout(resolve, 750));
        this.e.info.title.innerText = this.song.title;
        this.e.info.artist.innerText = this.song.artist;
        const coverUrl = await api.getSongCover(this.song.id).catch(() => 'imgs/default-cover.png');
        this.e.info.cover.style.backgroundImage = `url('${coverUrl}') || url('imgs/default-cover.png')`;
        this.e.progress.time.innerText = `00:00 / ${this.song.duration}`;
        this.lastRenderedTimeText = `00:00 / ${this.song.duration}`;
        this.lastRenderedBarWidth = '0%';
        this.e.progress.bar.style.transition = "width 0.1s linear";
    }

    async start() {
        const playlist = this.getPlaylist();
        if (playlist.songs.length == 0) {
            this.status = 'idle';
            return;
        }
        // Keep the cursor within playlist bounds (wrap around in either direction).
        let cursor = playlist.cursor % playlist.songs.length;
        if (cursor < 0) {
            cursor += playlist.songs.length;
        }
        if (cursor !== playlist.cursor) {
            sessionStorage.setItem('PlaylistCursor', String(cursor));
        }

        // Clean up any preloaded/queued audio from the previous song.
        this.preloadedChunks = [];
        this.nextChunkReady = false;
        this.isPreloading = false;
        this.isChangingChunk = false;
        [this.audioA, this.audioB].forEach((el) => {
            if (el && el.src) {
                URL.revokeObjectURL(el.src);
                el.pause();
                el.removeAttribute('src');
                el.load();
            }
        });

        const id = playlist.songs[cursor].id;
        // `currentChunk` is the 0-based index (matching the API) of the
        // chunk currently loaded into `this.audio`.
        this.currentChunk = 0;
        // Always start a new song on the "A" element so audioA/audioB
        // stay in sync with the load/prepare logic below.
        this.audio = this.audioA;
        const info = await api.getSongInfo(id);
        this.song = info;
        this.song.id = id;
        this.song.duration = this.formatTime(this.song.chunks*5);
        this.song.currentTime = "00:00";
        this.lastRenderedTimeText = '';
        this.lastRenderedBarWidth = '';
        this.resetPlayedSecondsTracking();
        this.song.preloadChunkCount = parseInt(localStorage.getItem("settings.preloadChunkCount")) || 2;
        this.nextChunkLeadMs = Math.max(0, parseInt(localStorage.getItem("settings.nextChunkLeadMs")) || 75);
        const renderer = this.renderSong();

        // Load the first chunk into the active audio element and start
        // playback. Without this, nothing is ever assigned to `audio.src`
        // and the worker loop has nothing to play.
        const firstChunk = await (await api.getSongChunk(this.song.id, this.currentChunk)).blob();
        this.audio.src = URL.createObjectURL(firstChunk);
        await renderer;
        this.setPlayButtonState(true);
        this.status = 'playing';
        await this.audio.play();

        // Kick off buffering of the next chunk right away.
        this.preload();
        this.prepareNextChunk();
    }

    async worker() {
        if (!this.song||this.status == 'idle') {
            return;
        }
        this.renderProgress();
        if (this.status == 'paused') {
            this.audio.pause();
            this.resetPlayedSecondsTracking();
        }
        if (this.status == 'playing'&&this.audio.paused&&!this.audio.ended) {
            this.audio.play();
        }
        this.updatePlayedSecondsAfterLastUpdate();
        if (this.shouldSwitchToNextChunk()) {
            await this.handleChunkTransition();
        } else {
            this.preload();
            this.prepareNextChunk();
        }
    }

    shouldSwitchToNextChunk() {
        if (!this.song || !this.audio || this.status !== 'playing') {
            return false;
        }
        if (this.audio.ended) {
            return true;
        }
        if (!this.nextChunkLeadMs || this.currentChunk >= this.song.chunks - 1) {
            return false;
        }
        if (!this.nextChunkReady) {
            return false;
        }

        const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 5;
        const remainingMs = Math.max(0, (duration - this.audio.currentTime) * 1000);
        return remainingMs <= this.nextChunkLeadMs;
    }

    async handleChunkTransition() {
        if (!this.song || this.status === 'idle' || this.isChangingChunk) {
            return;
        }

        this.isChangingChunk = true;
        try {
            if (this.currentChunk >= this.song.chunks - 1) {
                this.status = 'idle';
                this.changeSong(1);
                return;
            }

            const finishedAudio = this.audio;
            const nextAudio = (this.audio == this.audioA) ? this.audioB : this.audioA;
            if (!nextAudio.src) {
                if (!this.audio.ended) {
                    return;
                }
                // The next chunk wasn't ready in time; fetch it now before swapping.
                this.nextChunkReady = false;
                await this.prepareNextChunk(true);
            }
            this.currentChunk++;
            this.audio = nextAudio;
            this.nextChunkReady = false;
            await this.audio.play();
            this.resetPlayedSecondsTracking();
            // Release the chunk we just finished playing, now that the
            // active audio element has switched to the other buffer.
            finishedAudio.pause();
            if (finishedAudio.src) {
                URL.revokeObjectURL(finishedAudio.src);
            }
            finishedAudio.removeAttribute('src');
            finishedAudio.load();
            // Start buffering the chunk after next into the now-inactive buffer.
            this.preload();
            this.prepareNextChunk();
        } finally {
            this.isChangingChunk = false;
        }
    }

    async preload() {
        const bufferedAhead = this.preloadedChunks.length + (this.nextChunkReady ? 1 : 0);
        if (this.isPreloading || this.status=='idle' || this.song.preloadChunkCount <= bufferedAhead) {
            return;
        }
        const nextChunkNum = this.currentChunk+this.preloadedChunks.length+(this.nextChunkReady ? 2 : 1);
        if (nextChunkNum >= this.song.chunks) {
            return;
        }
        this.isPreloading = true;
        try {
            const response = await api.getSongChunk(this.song.id, nextChunkNum);
            const blob = await response.blob();
            this.preloadedChunks.push(blob);
            // Fill the inactive audio element as soon as a chunk is available,
            // rather than waiting for the next worker tick.
            this.prepareNextChunk();
        } finally {
            this.isPreloading = false;
        }
        if (this.preloadedChunks.length < this.song.preloadChunkCount) {
            this.preload();
        }
    }

    async prepareNextChunk(force = false) {
        // Only skip if we've already buffered the *next* chunk into the
        // inactive audio element, or there's nothing left to buffer.
        if (this.nextChunkReady || (this.song.preloadChunkCount == 0 && !force) || (this.currentChunk+1 >= this.song.chunks)) {
            return;
        }
        var targetAudio;
        if (this.audio == this.audioA) {
            targetAudio = this.audioB;
        } else {
            targetAudio = this.audioA;
        }
        let blob;
        if (this.preloadedChunks.length > 0) {
            blob = this.preloadedChunks.shift();
        } else if (force) {
            const response = await api.getSongChunk(this.song.id, this.currentChunk+1);
            blob = await response.blob();
        } else {
            // Nothing preloaded yet and not forced — let preload() fetch it
            // on its own schedule instead of firing an extra request here.
            return;
        }
        if (targetAudio.src) {
            URL.revokeObjectURL(targetAudio.src);
        }
        targetAudio.src = URL.createObjectURL(blob);
        targetAudio.load();
        this.nextChunkReady = true;
    }

    changeSong(direction) {
        const playlist = this.getPlaylist();
        if (playlist.songs.length === 0) {
            sessionStorage.setItem('PlaylistCursor', '0');
            this.status = 'paused';
            return;
        }
        let cursor = (playlist.cursor + direction) % playlist.songs.length;
        if (cursor < 0) {
            cursor += playlist.songs.length;
        }
        this.status = 'idle';
        this.resetPlayedSecondsTracking();
        sessionStorage.setItem('PlaylistCursor', String(cursor));
        this.start();
    }

    workerIntervalFunc() {
        if (this.status == 'idle') {
            return;
        }
        this.worker();
    }

}

var playerAPI = window.playerAPI || null;

if (!window.playerAPI && window.top == window.self) {
    document.addEventListener('DOMContentLoaded', () => {
        window.playerAPI = new player();
        playerAPI = window.playerAPI;
    });
} else {
    playerAPI = window.playerAPI;
}
