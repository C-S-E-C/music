const MESSAGE_ICONS = {
    transfer_timeleft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm1 4h-2v5.6l4.4 2.6 1-1.7-3.4-2V7z"/></svg>',
    transfered_timeleft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm4.7 8.3-4-4-1.4 1.4 1.6 1.6H7v2h5.9l-1.6 1.6 1.4 1.4 4-4z"/></svg>',
    song_approval: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v16H4V5h4l1-2zm3 12.6 5.3-5.3-1.4-1.4-3.9 3.9-1.9-1.9-1.4 1.4 3.3 3.3z"/></svg>',
    auditor_granted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 20 6v5.4c0 5-3.4 8.6-8 10.1-4.6-1.5-8-5.1-8-10.1V6l8-3.5zm-1 12.1 5.2-5.2L14.8 8 11 11.8 9.2 10 7.8 11.4l3.2 3.2z"/></svg>',
    default: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v9A2.5 2.5 0 0 1 18.5 17H8l-5 4V5.5z"/></svg>'
};

let activeFilter = 'all';

function loadStoredStyle() {
    const style = localStorage.getItem('style');
    const target = document.getElementById('style');
    if (style && target) {
        target.textContent = style;
    }
}

function getMsgAPI() {
    try {
        if (window.top && window.top.msgAPI) return window.top.msgAPI;
    } catch (error) {
        return window.msgAPI;
    }

    return window.msgAPI;
}

function getMessages() {
    const currentMsgAPI = getMsgAPI();
    if (currentMsgAPI && Array.isArray(currentMsgAPI.allmsgs)) {
        return currentMsgAPI.allmsgs;
    }

    try {
        return JSON.parse(localStorage.getItem('msgapi-allmsgs')) || [];
    } catch (error) {
        return [];
    }
}

function senderName(message) {
    if (message.from_user === -1 || message.from_user === '-1') return 'System';
    if (message.from_username) return message.from_username;
    if (message.sender_username) return message.sender_username;
    return String(message.from_user || 'Unknown');
}

function messageDate(message) {
    if (!message.created_at) return '';
    const normalized = String(message.created_at).replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return String(message.created_at);
    return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function parseSongApproval(content) {
    const parts = String(content || '').split(': ');
    return {
        status: parts[0] || '',
        songId: parts.slice(1).join(': ') || ''
    };
}

function formatMessage(message) {
    if (message.type === 'song_approval') {
        const approval = parseSongApproval(message.content);
        if (approval.status === 'APPROVED') {
            return {
                title: 'Song Approved',
                body: `Song ${approval.songId} was approved.`,
                stateClass: 'approved'
            };
        }
        if (approval.status === 'REJECTED') {
            return {
                title: 'Song Rejected',
                body: `Song ${approval.songId} was rejected.`,
                stateClass: 'rejected'
            };
        }
    }

    if (message.type === 'transfer_timeleft') {
        return {
            title: 'Timeleft Received',
            body: message.content || 'Another user sent you timeleft.'
        };
    }

    if (message.type === 'transfered_timeleft') {
        return {
            title: 'Timeleft Sent',
            body: message.content || 'You sent timeleft to another user.'
        };
    }

    if (message.type === 'auditor_granted') {
        return {
            title: 'Auditor Access Granted',
            body: message.content || 'You were granted auditor access.'
        };
    }

    return {
        title: 'Message',
        body: message.content || ''
    };
}

function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

function renderMessage(message) {
    const formatted = formatMessage(message);
    const card = document.createElement('article');
    card.className = `message-card ${message.type || 'unknown'} ${formatted.stateClass || ''}`;

    const icon = document.createElement('div');
    icon.className = 'message-icon';
    icon.innerHTML = MESSAGE_ICONS[message.type] || MESSAGE_ICONS.default;

    const content = document.createElement('div');
    content.className = 'message-content';

    const titleRow = document.createElement('div');
    titleRow.className = 'message-title-row';
    titleRow.append(
        createTextElement('h2', 'message-title', formatted.title),
        createTextElement('time', 'message-time', messageDate(message))
    );

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.append(
        createTextElement('span', 'message-pill', senderName(message)),
        createTextElement('span', 'message-pill', message.type || 'unknown')
    );

    content.append(
        titleRow,
        createTextElement('p', 'message-body', formatted.body),
        meta
    );

    card.append(icon, content);
    return card;
}

function renderMessages() {
    const list = document.getElementById('message-list');
    const empty = document.getElementById('message-empty');
    const count = document.getElementById('message-count');
    const messages = getMessages()
        .slice()
        .sort((a, b) => new Date(String(b.created_at || '').replace(' ', 'T')) - new Date(String(a.created_at || '').replace(' ', 'T')));
    const filtered = activeFilter === 'all' ? messages : messages.filter((message) => message.type === activeFilter);

    list.replaceChildren(...filtered.map(renderMessage));
    empty.hidden = filtered.length > 0;
    count.textContent = `${filtered.length} of ${messages.length} messages`;
}

function bindFilters() {
    document.querySelectorAll('.message-filter').forEach((button) => {
        button.addEventListener('click', () => {
            activeFilter = button.dataset.filter || 'all';
            document.querySelectorAll('.message-filter').forEach((item) => {
                item.classList.toggle('active', item === button);
            });
            renderMessages();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadStoredStyle();
    bindFilters();
    renderMessages();
    window.setInterval(renderMessages, 5000);
});
