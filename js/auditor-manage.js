function auditorManageStatus(message, type = '') {
    const status = document.getElementById('auditor-manage-status');
    if (!status) return;
    status.textContent = message;
    status.className = `history-status ${type}`.trim();
}

function readAuditorTarget(form) {
    const userIdValue = form.elements.userId.value.trim();
    const username = form.elements.username.value.trim();
    const userId = userIdValue ? Number(userIdValue) : null;

    if (!userId && !username) {
        throw new Error('Enter a user ID or username.');
    }

    return { userId, username: username || null };
}

function setAuditorFormDisabled(form, disabled) {
    form.querySelectorAll('input, button').forEach((element) => {
        element.disabled = disabled;
    });
}

async function submitAuditorAccess(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const action = form.dataset.action;
    let target;

    try {
        target = readAuditorTarget(form);
    } catch (error) {
        auditorManageStatus(error.message, 'error');
        return;
    }

    setAuditorFormDisabled(form, true);
    auditorManageStatus(`${action === 'grant' ? 'Granting' : 'Revoking'} auditor access.`);

    try {
        if (action === 'grant') {
            await api.grantAuditor(target.userId, target.username);
            auditorManageStatus('Auditor access granted.', 'success');
        } else {
            await api.revokeAuditor(target.userId, target.username);
            auditorManageStatus('Auditor access revoked.', 'success');
        }
        form.reset();
    } catch (error) {
        auditorManageStatus(error.message || 'Failed to update auditor access.', 'error');
    } finally {
        setAuditorFormDisabled(form, false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('grant-auditor-form')?.addEventListener('submit', submitAuditorAccess);
    document.getElementById('revoke-auditor-form')?.addEventListener('submit', submitAuditorAccess);
});
