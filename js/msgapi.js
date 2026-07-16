class MsgAPI {
    constructor() {
        this.allmsgs = JSON.parse(localStorage.getItem('msgapi-allmsgs')) || [];
        this.readmsgs = JSON.parse(localStorage.getItem('msgapi-readmsgs')) || [];
        this.styleId = 'msgapi-style';
        this.containerId = 'msgapi-container';
        this.defaultTimeout = 5200;
        this.isListeningMessages = false;
        this.icons = {
            error: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4 22 20H2L12 2.4zm-1 6.1v6h2v-6h-2zm0 8v2h2v-2h-2z"/></svg>',
            warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4 22 20H2L12 2.4zm-1 6.1v6h2v-6h-2zm0 8v2h2v-2h-2z"/></svg>',
            info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 10h2v8h-2v-8zm0-4h2v2h-2V6zm1 16a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/></svg>',
            success: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 16.6 4.8 12l-1.4 1.4 6 6L21 7.8 19.6 6.4 9.4 16.6z"/></svg>'
        };
        this.msgListener = setInterval(this.msgListenerFunc.bind(this), 20000);
        this.msgListenerFunc();
    }

    async msgListenerFunc() {
        if (this.isListeningMessages) return;
        if (!top.api || !top.api.me) {
            await this.wait(500);
            this.msgListenerFunc();
            return;
        }
        if (!top.api.me.messages) return;

        this.isListeningMessages = true;

        try {
            var msgcount = 0;
            for (let msg of top.api.me.messages) {
                if (this.readmsgs.includes(msg.id)) continue;
                msgcount++;
                var content; var title; var type; var options = {};
                if (msg.type == "song_approval") {
                    options.onclick = () => {
                        open("/creator/history.html","_blank");
                    }
                    const parts = msg.content.split(": ");
                    if (parts.length != 2) continue;
                    if (parts[0] == "APPROVED") {
                        title = "Song Approved"
                        type = "success";
                        content = `Your song '${parts[1]}' has been approved!`;
                    } else if (parts[0] == "REJECTED") {
                        title = "Song Rejected"
                        type = "error";
                        content = `Your song '${parts[1]}' has been rejected.`;
                    }
                } else if (msg.type == "transfer_timeleft") {
                    type = "info";
                    title = "Got Timeleft";
                    content = "Got "+msg.content;
                } else if (msg.type == "transfered_timeleft") {
                    type = "warn";
                    title = "Gave Timeleft";
                    content = "Gave "+msg.content;
                } else if (msg.type == "auditor_granted") {
                    type = "info";
                    title = "Auditor Granted";
                    content = msg.content;
                }

                if (!type) continue;
                this.newMessage(type, title, content, options);
                this.readmsgs.push(msg.id);
                this.allmsgs.push(msg);
                await this.wait(750);
            }
            if (msgcount >= 5) {
                this.newMessage(
                    "info", "Tip",
                    "You can view all messaget in message center. (Settings -> Message Center)\nOr byclicking on this message.",
                    {timeout: 15000,onclick: openMessageCenter}
                );
            }

            localStorage.setItem('msgapi-readmsgs', JSON.stringify(this.readmsgs));
            localStorage.setItem('msgapi-allmsgs', JSON.stringify(this.allmsgs));
        } finally {
            this.isListeningMessages = false;
        }
    }

    wait(ms) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }

    messageDocument() {
        try {
            if (window.top && window.top.document) {
                return window.top.document;
            }
        } catch (error) {
            return document;
        }
        return document;
    }

    injectStyle(targetDocument) {
        if (targetDocument.getElementById(this.styleId)) return;

        const style = targetDocument.createElement('style');
        style.id = this.styleId;
        style.textContent = `
            #${this.containerId} {
                position: fixed;
                top: 22px;
                right: 22px;
                width: min(360px, calc(100vw - 28px));
                display: grid;
                gap: 10px;
                pointer-events: none;
                z-index: 2147483647;
                transition: gap 260ms ease;
            }

            .msgapi-message {
                min-height: 68px;
                border: 1px solid color-mix(in srgb, var(--front-color, #ffffff) 14%, transparent);
                border-radius: 18px;
                padding: 12px 14px;
                display: grid;
                grid-template-columns: 34px minmax(0, 1fr) 26px;
                gap: 11px;
                align-items: center;
                color: var(--front-color, #ffffff);
                background-color: var(--player-bg-color, rgba(50, 50, 50, 0.5));
                backdrop-filter: var(--player-backdrop-filter, blur(10px));
                -webkit-backdrop-filter: var(--player-backdrop-filter, blur(10px));
                box-shadow: 0 18px 50px rgba(0, 0, 0, 0.26);
                pointer-events: auto;
                transform: translateY(-28px) scale(0.98);
                opacity: 0;
                transition:
                    transform 320ms cubic-bezier(0.18, 0.89, 0.32, 1.18),
                    opacity 220ms ease;
                will-change: transform, opacity;
            }

            .msgapi-message.show {
                transform: translateY(0) scale(1);
                opacity: 1;
            }

            .msgapi-icon {
                width: 34px;
                height: 34px;
                border-radius: 50%;
                display: grid;
                place-items: center;
                background: color-mix(in srgb, currentColor 18%, transparent);
            }

            .msgapi-icon svg {
                width: 20px;
                height: 20px;
                fill: currentColor;
            }

            .msgapi-content {
                min-width: 0;
                display: grid;
                gap: 3px;
            }

            .msgapi-title {
                overflow: hidden;
                font-size: 0.94rem;
                font-weight: 800;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .msgapi-text {
                overflow-wrap: anywhere;
                color: color-mix(in srgb, var(--front-color, #ffffff) 70%, transparent);
                font-size: 0.86rem;
                line-height: 1.35;
            }

            .msgapi-close {
                width: 26px;
                height: 26px;
                border: 0;
                border-radius: 50%;
                display: grid;
                place-items: center;
                color: color-mix(in srgb, var(--front-color, #ffffff) 62%, transparent);
                background: transparent;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
            }

            .msgapi-close:hover {
                background: color-mix(in srgb, var(--front-color, #ffffff) 10%, transparent);
            }

            .msgapi-message.error .msgapi-icon { color: var(--color-red-50, #ff5f57); }
            .msgapi-message.warn .msgapi-icon { color: var(--color-yellow-50, #ffbd2e); }
            .msgapi-message.info .msgapi-icon { color: var(--color-teal-50, #03a6a0); }
            .msgapi-message.success .msgapi-icon { color: var(--color-forest-40, #5ecc88); }

            @media (max-width: 520px) {
                #${this.containerId} {
                    top: 14px;
                    right: 14px;
                }
            }
        `;
        targetDocument.head.appendChild(style);
    }

    container(targetDocument) {
        this.injectStyle(targetDocument);

        let target = targetDocument.getElementById(this.containerId);
        if (!target) {
            target = targetDocument.createElement('div');
            target.id = this.containerId;
            target.setAttribute('aria-live', 'polite');
            target.setAttribute('aria-atomic', 'false');
            targetDocument.body.appendChild(target);
        }
        return target;
    }

    escapeHtml(value) {
        return String(value || '').replace(/[&<>"]/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        }[char]));
    }

    normalizeArgs(title, message, options) {
        if (typeof message === 'object' && message !== null) {
            options = message;
            message = '';
        }

        if (!message) {
            message = title;
            title = '';
        }

        return {
            title: String(title || ''),
            message: String(message || ''),
            options: options || {}
        };
    }

    removeMessage(messageElement) {
        messageElement.classList.remove('show');
        window.setTimeout(() => {
            messageElement.remove();
        }, 260);
    }

    animateMovedMessages(targetDocument, previousPositions) {
        for (const item of previousPositions) {
            const newTop = item.element.getBoundingClientRect().top;
            const offset = item.top - newTop;

            if (!offset) continue;

            item.element.style.transition = 'none';
            item.element.style.transform = `translateY(${offset}px)`;

            targetDocument.defaultView.requestAnimationFrame(() => {
                item.element.style.transition = 'transform 320ms cubic-bezier(0.18, 0.89, 0.32, 1)';
                item.element.style.transform = '';
            });

            targetDocument.defaultView.setTimeout(() => {
                item.element.style.transition = '';
            }, 340);
        }
    }

    newMessage(type, title, message, options) {
        const args = this.normalizeArgs(title, message, options);
        const targetDocument = this.messageDocument();
        const targetContainer = this.container(targetDocument);
        const messageElement = targetDocument.createElement('div');
        const timeout = Number(args.options.timeout ?? this.defaultTimeout);
        const previousPositions = Array.from(targetContainer.children).map((element) => ({
            element,
            top: element.getBoundingClientRect().top
        }));

        messageElement.className = `msgapi-message ${type}`;
        messageElement.setAttribute('role', type === 'error' ? 'alert' : 'status');
        messageElement.innerHTML = `
            <div class="msgapi-icon">${this.icons[type]}</div>
            <div class="msgapi-content">
                ${args.title ? `<div class="msgapi-title">${this.escapeHtml(args.title)}</div>` : ''}
                <div class="msgapi-text">${this.escapeHtml(args.message)}</div>
            </div>
            <button class="msgapi-close" type="button" aria-label="Close message">×</button>
        `;

        if (typeof args.options.onclick === 'function') {
            messageElement.addEventListener('click', args.options.onclick);
        }

        messageElement.querySelector('.msgapi-close').addEventListener('click', (event) => {
            event.stopPropagation();
            this.removeMessage(messageElement);
        });

        targetContainer.prepend(messageElement);
        this.animateMovedMessages(targetDocument, previousPositions);
        targetDocument.defaultView.requestAnimationFrame(() => {
            messageElement.classList.add('show');
        });

        if (timeout > 0) {
            targetDocument.defaultView.setTimeout(() => {
                this.removeMessage(messageElement);
            }, timeout);
        }

        return messageElement;
    }

    newError(title, message, options) {
        return this.newMessage('error', title, message, options);
    }

    newWarn(title, message, options) {
        return this.newMessage('warn', title, message, options);
    }

    newInfo(title, message, options) {
        return this.newMessage('info', title, message, options);
    }

    newSuccess(title, message, options) {
        return this.newMessage('success', title, message, options);
    }
}

window.MsgAPI = MsgAPI;
window.msgAPI = window.msgAPI || new MsgAPI();
var msgAPI = window.msgAPI;
