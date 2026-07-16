function resetField(id) {
    return document.getElementById(id);
}

function setResetMessage(type, message) {
    const error = resetField('reset-error');
    const success = resetField('reset-success');

    error.style.display = 'none';
    success.style.display = 'none';
    error.textContent = '';
    success.textContent = '';

    if (!message) return;

    const target = type === 'success' ? success : error;
    target.textContent = message;
    target.style.display = 'block';
}

async function requestReset() {
    const username = resetField('reset-username').value.trim();
    const email = resetField('reset-email').value.trim();

    if (!username && !email) {
        setResetMessage('error', 'Enter a username or email.');
        return;
    }

    try {
        await api.requestPasswordReset(username || null, email || null);
        setResetMessage('success', 'Password reset requested. Check your reset instructions.');
    } catch (error) {
        setResetMessage('error', error.message || 'Failed to request password reset.');
    }
}

async function setNewPassword() {
    const resetToken = resetField('reset-token').value.trim();
    const newPassword = resetField('reset-new-password').value;

    if (!resetToken || !newPassword) {
        setResetMessage('error', 'Reset token and new password are required.');
        return;
    }

    try {
        await api.resetPassword(resetToken, newPassword);
        resetField('reset-token').value = '';
        resetField('reset-new-password').value = '';
        setResetMessage('success', 'Password reset complete. You can log in now.');
    } catch (error) {
        setResetMessage('error', error.message || 'Failed to reset password.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    resetField('request-reset').addEventListener('click', requestReset);
    resetField('set-password').addEventListener('click', setNewPassword);
});
