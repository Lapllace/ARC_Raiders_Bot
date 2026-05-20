const MAX_LINES = 30;

/** @type {string[]} */
const buffer = [];

function formatLine(level, args) {
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const body = args
        .map((a) => {
            if (typeof a === 'string') return a;
            try {
                return JSON.stringify(a);
            } catch {
                return String(a);
            }
        })
        .join(' ');
    return `[${ts}] [${level}] ${body}`;
}

function pushLine(line) {
    buffer.push(line);
    if (buffer.length > MAX_LINES) {
        buffer.shift();
    }
}

let initialized = false;

/**
 * Redireciona console.log/error/warn para um buffer circular
 * consumido pelo painel web (últimas 30 linhas).
 */
export function setupLogBuffer() {
    if (initialized) return;
    initialized = true;
    const original = {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
    };

    console.log = (...args) => {
        pushLine(formatLine('INFO', args));
        original.log(...args);
    };

    console.error = (...args) => {
        pushLine(formatLine('ERROR', args));
        original.error(...args);
    };

    console.warn = (...args) => {
        pushLine(formatLine('WARN', args));
        original.warn(...args);
    };

    console.log('📟 Buffer de logs do painel ativado.');
}

export function getLogs() {
    return [...buffer];
}
