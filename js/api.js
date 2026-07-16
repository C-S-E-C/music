// API configuration
if (localStorage.getItem('apiUrl') == null || localStorage.getItem('apiUrl') == 'null'){
    localStorage.setItem('apiUrl', prompt("This app is currently in beta. \n If you are beta, please enter the API URL:"));
}
const API_URL = localStorage.getItem('apiUrl');

function logout() {
    api.clearToken();
    window.location.href = 'index.html';
}

class MusicAPI {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.PlayedSecondsAfterLastUpdate = 0;
        const publicPages = ['/index.html', '/reset-password.html', '/settings.html'];
        const isPublicPage = publicPages.includes(window.location.pathname);
        if((this.token == null || this.token == 'null')&&!isPublicPage){
            window.location.href = '/index.html';
        }
        if ((this.token == null || this.token == 'null') && isPublicPage) {
            return;
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

    async requestPasswordReset(username = null, email = null) {
        const body = {};
        if (username) body.username = username;
        if (email) body.email = email;

        return this.makeRequest('/request-password-reset', {
            method: 'POST',
            body: JSON.stringify(body),
            skipAuth: true,
        });
    }

    async resetPassword(resetToken, newPassword) {
        return this.makeRequest('/reset-password', {
            method: 'POST',
            body: JSON.stringify({
                reset_token: resetToken,
                new_password: newPassword,
            }),
            skipAuth: true,
        });
    }

    async _updateMe() {
        var request={};
        try{
            request = await this.makeRequest('/me');
        } catch (e) {
            if (e.status == 401){
                self.logout();
            }
            new Promise(resolve => setTimeout(resolve, 5000)).then(() => {
                this._updateMe();
            })
            return;
        }
        this.PlayedSecondsAfterLastUpdate = 0;
        this.me = request;
        this.me.last_fetch = new Date().toISOString();
    }

    async getMe() {
        return this.makeRequest('/me');
    }

    async verifyAccount() {
        return this.makeRequest('/verify-account', {
            method: 'POST',
        });
    }

    // Song endpoints
    async uploadSong(title, artist, album, tag, audioFile, lyricsFile = null, coverFile = null) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('artist', artist);
        formData.append('album', album);
        formData.append('tag', tag);
        formData.append('audio', audioFile);
        if (lyricsFile) {
            formData.append('lyrics', lyricsFile);
        }
        if (coverFile) {
            formData.append('cover', coverFile);
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

    async getMySongs() {
        return this.makeRequest('/my-songs');
    }

    async searchSongs(query) {
        return this.makeRequest(`/search-song/${encodeURIComponent(query)}`, {
            skipAuth: true,
        });
    }

    async getSongInfo(songId, useAuth = false) {
        return this.makeRequest(`/get-song-info/${songId}`, {
            skipAuth: !useAuth,
        });
    }

    async getSongLyrics(songId, reviewToken = null) {
        const headers = {};
        if (reviewToken) {
            headers['X-Review-Token'] = reviewToken;
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
        }

        const response = await fetch(`${API_URL}/get-song-info/${songId}/lyrics`, {
            headers,
        });
        if (!response.ok) {
            throw new Error('Lyrics not found');
        }
        return response.text();
    }

    async getSongCover(songId) {
        return `${API_URL}/get-song-info/${songId}/cover`;
    }

    async getSongCoverResponse(songId, reviewToken = null) {
        const headers = {};
        if (reviewToken) {
            headers['X-Review-Token'] = reviewToken;
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
        }

        const response = await fetch(`${API_URL}/get-song-info/${songId}/cover`, {
            headers,
        });
        if (!response.ok) {
            throw new Error('Cover not found');
        }
        return response;
    }

    async getSongChunk(songId, chunk, reviewToken = null) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }
        const headers = {
            'Authorization': `Bearer ${this.token}`
        };
        if (reviewToken) {
            headers['X-Review-Token'] = reviewToken;
        }

        const response = await fetch(`${API_URL}/get-song/${songId}/${chunk}`, {
            headers,
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

    async grantAuditor(userId = null, username = null) {
        const body = {};
        if (userId) body.user_id = userId;
        if (username) body.username = username;

        return this.makeRequest('/grant-auditor', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async revokeAuditor(userId = null, username = null) {
        const body = {};
        if (userId) body.user_id = userId;
        if (username) body.username = username;

        return this.makeRequest('/revoke-auditor', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async getPendingApproval() {
        return this.makeRequest('/song/pending-approval');
    }

    async approveSong(songId, reviewToken) {
        return this.makeRequest(`/song/approve/${songId}`, {
            method: 'POST',
            headers: {
                'X-Review-Token': reviewToken,
            },
        });
    }

    async rejectSong(songId, reviewToken) {
        return this.makeRequest(`/song/reject/${songId}`, {
            method: 'POST',
            headers: {
                'X-Review-Token': reviewToken,
            },
        });
    }

}

var api = window.api || null;

try {
    if (!api && window.top && window.top !== window.self && window.top.api) {
        api = window.top.api;
    }
} catch (error) {
    api = null;
}

if (!api) {
    api = new MusicAPI();
}

window.api = api;
window.API_URL = API_URL;
