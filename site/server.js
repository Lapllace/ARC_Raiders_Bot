import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import QRCode from 'qrcode';
import { botManager } from '../services/bot-manager.service.js';
import { getLogs, setupLogBuffer } from '../services/log-buffer.service.js';
import { ApiService } from '../services/api.service.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.DASHBOARD_PORT) || 3000;

let logBufferReady = false;

function ensureLogBuffer() {
    if (!logBufferReady) {
        setupLogBuffer();
        logBufferReady = true;
    }
}

function jsonError(res, status, message) {
    return res.status(status).json({ ok: false, error: message });
}

/**
 * Inicia o servidor Express do painel ARC-Bot.
 * @param {number} [port]
 */
export function startDashboard(port = PORT) {
    ensureLogBuffer();

    const app = express();
    app.use(express.json());
    app.use(express.static(PUBLIC_DIR));

    // --- Status & QR ---
    app.get('/api/status', (_req, res) => {
        res.json({ ok: true, ...botManager.getStatusPayload() });
    });

    app.get('/api/qr', async (_req, res) => {
        const qr = botManager.getQRString();
        if (!qr) {
            return res.json({ ok: true, qr: null });
        }
        try {
            const dataUrl = await QRCode.toDataURL(qr, {
                width: 280,
                margin: 2,
                color: { dark: '#00f0ff', light: '#0a0e14' },
            });
            res.json({ ok: true, qr: dataUrl });
        } catch (err) {
            jsonError(res, 500, `Falha ao gerar QR: ${err.message}`);
        }
    });

    // --- Controle do bot ---
    app.post('/api/connect', async (_req, res) => {
        try {
            await botManager.connect();
            res.json({ ok: true, message: 'Conexão iniciada.', ...botManager.getStatusPayload() });
        } catch (err) {
            jsonError(res, 500, err.message);
        }
    });

    app.post('/api/disconnect', async (_req, res) => {
        try {
            await botManager.disconnect();
            res.json({ ok: true, message: 'Bot desconectado.' });
        } catch (err) {
            jsonError(res, 500, err.message);
        }
    });

    app.post('/api/restart', async (_req, res) => {
        try {
            await botManager.restart();
            res.json({ ok: true, message: 'Reinício solicitado.' });
        } catch (err) {
            jsonError(res, 500, err.message);
        }
    });

    app.post('/api/repair-cache', async (_req, res) => {
        try {
            await botManager.repairCache();
            res.json({ ok: true, message: 'Cache reparado. Novo QR em breve.' });
        } catch (err) {
            jsonError(res, 500, err.message);
        }
    });

    app.post('/api/update-bot', async (_req, res) => {
        try {
            const { stdout, stderr } = await execAsync('git pull', {
                cwd: ROOT_DIR,
                timeout: 120000,
            });
            const output = [stdout, stderr].filter(Boolean).join('\n').trim();
            console.log('📦 git pull executado pelo painel:\n', output || '(sem saída)');
            res.json({
                ok: true,
                message: 'Atualização concluída. Reinicie o container/processo para aplicar.',
                output: output || 'Repositório já atualizado.',
            });
        } catch (err) {
            jsonError(res, 500, err.stderr || err.message || 'git pull falhou');
        }
    });

    // --- Radar & logs ---
    app.get('/api/radar', async (_req, res) => {
        const radar = await ApiService.getDashboardRadar();
        res.json({ ok: true, ...radar });
    });

    app.get('/api/logs', (_req, res) => {
        res.json({ ok: true, lines: getLogs() });
    });

    // Fallback SPA (Express 5)
    app.use((_req, res) => {
        res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    });

    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`🖥️  Painel ARC-Bot: http://localhost:${port}`);
            resolve(server);
        });
    });
}

// Execução direta: node site/server.js
const isMain =
    process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
    startDashboard().then(() => {
        if (process.env.AUTO_CONNECT !== 'false') {
            botManager.connect().catch((err) => {
                console.error('❌ Auto-conexão falhou:', err.message);
            });
        }
    });
}
