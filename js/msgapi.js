(function () {
    const MESSAGE_STYLE_ID = 'msgapi-style';
    const MESSAGE_CONTAINER_ID = 'msgapi-container';
    const DEFAULT_TIMEOUT = 5200;

    const icons = {
        error: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4 22 20H2L12 2.4zm-1 6.1v6h2v-6h-2zm0 8v2h2v-2h-2z"/></svg>',
        warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4 22 20H2L12 2.4zm-1 6.1v6h2v-6h-2zm0 8v2h2v-2h-2z"/></svg>',
        info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 10h2v8h-2v-8zm0-4h2v2h-2V6zm1 16a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/></svg>',
        success: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 16.6 4.8 12l-1.4 1.4 6 6L21 7.8 19.6 6.4 9.4 16.6z"/></svg>'
    };

    function messageDocument() {
        try {
            if (window.top && window.top.document) {
                return window.top.document;
            }
        } catch (error) {
            return document;
        }
        return document;
    }

    function injectStyle(targetDocument) {
        if (targetDocument.getElementById(MESSAGE_STYLE_ID)) return;

        const style = targetDocument.createElement('style');
        style.id = MESSAGE_STYLE_ID;
        style.textContent = `
            #${MESSAGE_CONTAINER_ID} {
                position: fixed;
                top: 22px;
                right: 22px;
                width: min(360px, calc(100vw - 28px));
                display: grid;
                gap: 10px;
                pointer-events: none;
                z-index: 2147483647;
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
                transform: translateX(calc(100% + 28px));
                opacity: 0;
                transition: transform 260ms ease, opacity 220ms ease;
            }

            .msgapi-message.show {
                transform: translateX(0);
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
                #${MESSAGE_CONTAINER_ID} {
                    top: 14px;
                    right: 14px;
                }
            }
        `;
        targetDocument.head.appendChild(style);
    }

    function container(targetDocument) {
        injectStyle(targetDocument);

        let target = targetDocument.getElementById(MESSAGE_CONTAINER_ID);
        if (!target) {
            target = targetDocument.createElement('div');
            target.id = MESSAGE_CONTAINER_ID;
            target.setAttribute('aria-live', 'polite');
            target.setAttribute('aria-atomic', 'false');
            targetDocument.body.appendChild(target);
        }
        return target;
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"]/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        }[char]));
    }

    function normalizeArgs(title, message, options) {
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

    function removeMessage(messageElement) {
        messageElement.classList.remove('show');
        window.setTimeout(() => {
            messageElement.remove();
        }, 260);
    }

    function newMessage(type, title, message, options) {
        const args = normalizeArgs(title, message, options);
        const targetDocument = messageDocument();
        const targetContainer = container(targetDocument);
        const messageElement = targetDocument.createElement('div');
        const timeout = Number(args.options.timeout ?? DEFAULT_TIMEOUT);
        messageElement.onclick = args.options.onclick ?? (() => {});

        messageElement.className = `msgapi-message ${type}`;
        messageElement.setAttribute('role', type === 'error' ? 'alert' : 'status');
        messageElement.innerHTML = `
            <div class="msgapi-icon">${icons[type]}</div>
            <div class="msgapi-content">
                ${args.title ? `<div class="msgapi-title">${escapeHtml(args.title)}</div>` : ''}
                <div class="msgapi-text">${escapeHtml(args.message)}</div>
            </div>
            <button class="msgapi-close" type="button" aria-label="Close message">×</button>
        `;

        messageElement.querySelector('.msgapi-close').addEventListener('click', () => {
            removeMessage(messageElement);
        });

        targetContainer.prepend(messageElement);
        targetDocument.defaultView.requestAnimationFrame(() => {
            messageElement.classList.add('show');
        });

        if (timeout > 0) {
            targetDocument.defaultView.setTimeout(() => {
                removeMessage(messageElement);
            }, timeout);
        }

        return messageElement;
    }

    var api = {
        newError: (title, message, options) => newMessage('error', title, message, options),
        newWarn: (title, message, options) => newMessage('warn', title, message, options),
        newInfo: (title, message, options) => newMessage('info', title, message, options),
        newSuccess: (title, message, options) => newMessage('success', title, message, options)
    };

    window.msgAPI = api;
})();

var msgAPI = window.msgAPI;
