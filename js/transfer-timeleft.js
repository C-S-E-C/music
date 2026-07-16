function transferElement(id) {
    return document.getElementById(id);
}

function loadStoredStyle() {
    const style = localStorage.getItem('style');
    const target = transferElement('style');
    if (style && target) {
        target.textContent = style;
    }
}

function setTransferStatus(message, type = '') {
    const status = transferElement('transfer-status');
    status.textContent = message;
    status.className = type;
}

function setTransferBusy(isBusy) {
    transferElement('transfer-submit').disabled = isBusy;
    transferElement('transfer-reset').disabled = isBusy;
}

function readTransferPayload() {
    const amount = Number(transferElement('transfer-amount').value);
    const recipientIdValue = transferElement('transfer-recipient-id').value.trim();
    const username = transferElement('transfer-username').value.trim();
    const email = transferElement('transfer-email').value.trim();
    const recipientId = recipientIdValue ? Number(recipientIdValue) : null;

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Enter a transfer amount greater than 0.');
    }

    if (!recipientId && !username && !email) {
        throw new Error('Enter a recipient user ID, username, or email.');
    }

    return {
        amount: Math.floor(amount),
        recipientId,
        username: username || null,
        email: email || null
    };
}

async function submitTransfer(event) {
    event.preventDefault();

    let payload;
    try {
        payload = readTransferPayload();
    } catch (error) {
        setTransferStatus(error.message, 'error');
        return;
    }

    setTransferBusy(true);
    setTransferStatus('Transferring timeleft.');

    try {
        await api.transferTimeleft(payload.amount, payload.recipientId, payload.username, payload.email);
        setTransferStatus('Timeleft transferred.', 'success');
        transferElement('transfer-form').reset();
    } catch (error) {
        setTransferStatus(error.message || 'Failed to transfer timeleft.', 'error');
    } finally {
        setTransferBusy(false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadStoredStyle();
    transferElement('transfer-form').addEventListener('submit', submitTransfer);
    transferElement('transfer-form').addEventListener('reset', () => {
        setTransferStatus('');
    });
});
