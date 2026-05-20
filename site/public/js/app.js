const API = '';
const POLL_STATUS_MS = 2500;
const POLL_LOGS_MS = 3000;
const POLL_RADAR_MS = 45000;

const STATUS_LABELS = {
    online: { text: 'Online', emoji: '🟢', led: 'led-online' },
    disconnected: { text: 'Desconectado', emoji: '🔴', led: 'led-offline' },
    qr: { text: 'Aguardando QR Code', emoji: '🟡', led: 'led-qr' },
    connecting: { text: 'Conectando...', emoji: '🔵', led: 'led-connecting' },
};

const $ = (sel) => document.querySelector(sel);

async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || res.statusText || 'Erro na requisição');
    }
    return data;
}

function setActionLoading(loading) {
    document.querySelectorAll('[data-action]').forEach((btn) => {
        btn.disabled = loading;
    });
}

async function runAction(path, successMsg) {
    setActionLoading(true);
    try {
        const data = await api(path, { method: 'POST' });
        toast(successMsg || data.message || 'OK');
        await refreshStatus();
        await refreshLogs();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        setActionLoading(false);
    }
}

function toast(message, type = 'info') {
    const el = $('#toast');
    el.textContent = message;
    el.className =
        'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-semibold border transition-opacity ' +
        (type === 'error'
            ? 'border-red-500/50 bg-red-950/90 text-red-200'
            : 'border-cyan-500/30 bg-slate-900/95 text-cyan-100');
    el.classList.remove('opacity-0', 'pointer-events-none');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        el.classList.add('opacity-0', 'pointer-events-none');
    }, 4000);
}

function renderStatus(status) {
    const meta = STATUS_LABELS[status] || STATUS_LABELS.disconnected;
    const led = $('#status-led');
    const label = $('#status-label');

    led.className = `led led-pulse ${meta.led}`;
    label.innerHTML = `<span class="mr-2">${meta.emoji}</span>${meta.text}`;

    const qrSection = $('#qr-section');
    if (status === 'qr') {
        qrSection.classList.remove('hidden');
        loadQR();
    } else {
        qrSection.classList.add('hidden');
        $('#qr-image').src = '';
    }
}

async function refreshStatus() {
    try {
        const data = await api('/api/status');
        renderStatus(data.status);
    } catch (err) {
        console.error(err);
    }
}

async function loadQR() {
    try {
        const data = await api('/api/qr');
        const img = $('#qr-image');
        if (data.qr) {
            img.src = data.qr;
            img.classList.remove('hidden');
        } else {
            img.classList.add('hidden');
        }
    } catch (err) {
        console.error(err);
    }
}

function classifyLogLine(line) {
    if (line.includes('[ERROR]')) return 'terminal-line-error';
    if (line.includes('[WARN]')) return 'terminal-line-warn';
    return 'terminal-line-info';
}

async function refreshLogs() {
    try {
        const data = await api('/api/logs');
        const box = $('#terminal-body');
        if (!data.lines?.length) {
            box.innerHTML =
                '<div class="text-slate-500">Aguardando logs do kernel ARC-Bot...</div>';
            return;
        }
        box.innerHTML = data.lines
            .map(
                (line) =>
                    `<div class="block whitespace-pre-wrap break-all ${classifyLogLine(line)}">${escapeHtml(line)}</div>`
            )
            .join('');
        box.scrollTop = box.scrollHeight;
    } catch (err) {
        console.error(err);
    }
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderRadar(data) {
    const grid = $('#radar-grid');
    const summary = $('#radar-summary');
    const invasions = $('#radar-invasions');

    if (data.error) {
        summary.textContent = data.error;
        summary.className = 'text-red-400 text-sm';
        grid.innerHTML = '';
        invasions.innerHTML = '';
        return;
    }

    summary.className = 'text-slate-400 text-sm';
    summary.textContent = data.message || (data.calm ? 'Atmosfera limpa em Speranza.' : '');

    grid.innerHTML = (data.maps || [])
        .map(
            (m) => `
        <div class="map-tile rounded-lg p-3 ${m.invaded ? 'invaded' : 'safe'}">
            <p class="font-display text-xs text-slate-500 uppercase tracking-wider">Setor</p>
            <p class="text-base font-semibold ${m.invaded ? 'text-red-300' : 'text-emerald-300/90'}">${escapeHtml(m.name)}</p>
            <p class="text-xs mt-1 ${m.invaded ? 'text-red-400/80' : 'text-slate-500'}">${m.invaded ? '⚠ INVASÃO ATIVA' : '◆ Seguro'}</p>
        </div>
    `
        )
        .join('');

    invasions.innerHTML = '';
    if (data.invasions?.length) {
        invasions.innerHTML = data.invasions
            .map(
                (inv) => `
            <div class="rounded-lg border border-red-500/30 bg-red-950/20 p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <h4 class="font-display text-cyan-300 text-lg">${escapeHtml(inv.map)}</h4>
                    <span class="text-xs text-amber-400 font-mono">${escapeHtml(inv.timeRemaining)}</span>
                </div>
                <p class="text-red-200/90 mt-1">${escapeHtml(inv.event)}</p>
            </div>
        `
            )
            .join('');
    } else if (data.calm) {
        invasions.innerHTML =
            '<p class="text-emerald-400/80 text-center py-4 font-display text-sm tracking-wide">✦ Nenhuma invasão detectada no radar</p>';
    }

    const updated = $('#radar-updated');
    if (data.updatedAt) {
        updated.textContent = `Atualizado: ${new Date(data.updatedAt).toLocaleTimeString('pt-BR')}`;
    }
}

async function refreshRadar() {
    try {
        const data = await api('/api/radar');
        renderRadar(data);
    } catch (err) {
        $('#radar-summary').textContent = 'Falha ao carregar radar.';
    }
}

function bindActions() {
    document.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            const messages = {
                connect: 'Conexão iniciada.',
                disconnect: 'Bot desconectado.',
                restart: 'Reinício em andamento.',
                'repair-cache': 'Cache reparado — escaneie o novo QR.',
                'update-bot': 'git pull executado. Verifique os logs.',
            };

            if (action === 'update-bot' && !confirm('Executar git pull no repositório do bot?')) {
                return;
            }
            if (
                action === 'repair-cache' &&
                !confirm('Isso apagará a pasta auth e exigirá novo pareamento. Continuar?')
            ) {
                return;
            }

            runAction(`/api/${action}`, messages[action]);
        });
    });

    $('#btn-refresh-radar')?.addEventListener('click', () => {
        refreshRadar();
        toast('Radar atualizado.');
    });
}

function updateClock() {
    const el = $('#header-clock');
    if (el) {
        el.textContent = new Date().toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }
}

function init() {
    bindActions();
    refreshStatus();
    refreshLogs();
    refreshRadar();
    updateClock();

    setInterval(refreshStatus, POLL_STATUS_MS);
    setInterval(refreshLogs, POLL_LOGS_MS);
    setInterval(refreshRadar, POLL_RADAR_MS);
    setInterval(updateClock, 1000);
}

document.addEventListener('DOMContentLoaded', init);
