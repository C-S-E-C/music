// API configuration
if (localStorage.getItem('apiUrl') == null || localStorage.getItem('apiUrl') == 'null'){
    localStorage.setItem('apiUrl', prompt("This app is currently in beta. \n If you are beta, please enter the API URL:"));
}
const API_URL = localStorage.getItem('apiUrl');

class MusicAPI {
    constructor() {
        this.token = localStorage.getItem('authToken');
        if((this.token == null || this.token == 'null')&&window.location.href != 'index.html'){
            window.location.href = 'index.html';
        }
        this._updateMe();
        this.meintervar = setInterval(async () => this._updateMe(), 30000);
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    getToken() {
        return this.token;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    async makeRequest(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (!options.skipAuth) {
            if (!this.token) {
                throw new Error('Not authenticated');
            }
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = new Error(data.error || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    // Auth endpoints
    async register(username, email, password) {
        return this.makeRequest('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
            skipAuth: true,
        });
    }

    async login(username, password, totp_code) {
        return this.makeRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password, totp_code }),
            skipAuth: true,
        });
    }

    async _updateMe() {
        const request = this.makeRequest('/me');
        this.me = await request;
        request.catch((e) => {
            if (e.status === 401){
                logout();
            }
            new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
                this._updateMe();
            })
        })
        this.me.last_fetch = new Date().toISOString();
    }

    // Song endpoints
    async uploadSong(title, artist, album, tag, audioFile, lyricsFile = null) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('artist', artist);
        formData.append('album', album);
        formData.append('tag', tag);
        formData.append('audio', audioFile);
        if (lyricsFile) {
            formData.append('lyrics', lyricsFile);
        }

        const headers = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_URL}/upload-song`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async searchSongs(query) {
        return this.makeRequest(`/search-song/${encodeURIComponent(query)}`, {
            skipAuth: true,
        });
    }

    async getSongInfo(songId) {
        return this.makeRequest(`/get-song-info/${songId}`, {
            skipAuth: true,
        });
    }

    async getSongLyrics(songId) {
        const response = await fetch(`${API_URL}/get-song-info/${songId}/lyrics`);
        if (!response.ok) {
            throw new Error('Lyrics not found');
        }
        return response.text();
    }

    async getSongCover(songId) {
        return `${API_URL}/get-song-info/${songId}/cover`;
    }

    async getSongChunk(songId, chunk) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }
        const response = await fetch(`${API_URL}/get-song/${songId}/${chunk}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });
        if (!response.ok) {
            throw new Error('Chunk not found');
        }
        return response;
    }

    async transferTimeleft(amount, recipientId = null, username = null, email = null) {
        const body = { amount };
        if (recipientId) body.recipient_id = recipientId;
        if (username) body.username = username;
        if (email) body.email = email;

        return this.makeRequest('/transfer-timeleft', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
}

const api = new MusicAPI();
