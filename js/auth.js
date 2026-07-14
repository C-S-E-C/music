// QR Code generation (simple implementation)
function generateQRCode(text) {
    // Using qr-server.com API for QR code generation
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
}

function switchToRegister() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
}

function switchToLogin() {
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
}

async function registerUser() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errorDiv = document.getElementById('register-error');
    const totpSetup = document.getElementById('totp-setup');

    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    totpSetup.style.display = 'none';

    if (!username || !email || !password) {
        errorDiv.textContent = 'Please fill all fields';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const result = await api.register(username, email, password);
        
        // Show TOTP setup
        const qrUrl = generateQRCode(result.totp_uri);
        document.getElementById('qr-code').innerHTML = `<img src="${qrUrl}" alt="TOTP QR Code" />`;
        document.getElementById('totp-secret').value = result.totp_secret;
        
        // Hide form inputs and show setup
        document.getElementById('register-username').style.display = 'none';
        document.getElementById('register-email').style.display = 'none';
        document.getElementById('register-password').style.display = 'none';
        document.querySelector('#register-form > button').style.display = 'none';
        totpSetup.style.display = 'block';
    } catch (error) {
        errorDiv.textContent = error.message || 'Registration failed';
        errorDiv.style.display = 'block';
    }
}

async function loginUser() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const totp_code = document.getElementById('login-totp').value.trim();
    const errorDiv = document.getElementById('login-error');

    errorDiv.textContent = '';
    errorDiv.style.display = 'none';

    if (!username || !password || !totp_code) {
        errorDiv.textContent = 'Please fill all fields';
        errorDiv.style.display = 'block';
        return;
    }

    if (totp_code.length !== 6 || !/^\d+$/.test(totp_code)) {
        errorDiv.textContent = 'TOTP code must be 6 digits';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const result = await api.login(username, password, totp_code);
        api.setToken(result.token);
        
        // Redirect to home page
        window.location.href = 'home.html';
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed';
        errorDiv.style.display = 'block';
    }
}

function logout() {
    api.clearToken();
    window.location.href = 'index.html';
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.value;
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

async function loadUserInfo() {
    try {
        if (!sessionStorage.getItem('authToken')) {
            sessionStorage.setItem('authToken', await api.getToken());
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (api.getToken() != null && api.getToken() != 'null') {
        // Redirect to home if already logged in
        window.location.href = 'home.html';
    }
});
