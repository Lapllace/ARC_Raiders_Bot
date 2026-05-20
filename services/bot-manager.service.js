import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { CommandHandler } from '../commands/handler.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUTH_DIR = path.join(ROOT_DIR, 'auth');

/** @typedef {'online' | 'disconnected' | 'qr' | 'connecting'} BotStatus */

class BotManager {
    constructor() {
        /** @type {BotStatus} */
        this.status = 'disconnected';
        /** @type {string | null} */
        this.currentQR = null;
        /** @type {import('@whiskeysockets/baileys').WASocket | null} */
        this.sock = null;
        this.autoReconnect = true;
        this.manualDisconnect = false;
        this._connecting = false;
        this._reconnectTimer = null;
    }

    setStatus(status) {
        this.status = status;
        if (status !== 'qr') {
            this.currentQR = null;
        }
    }

    getStatusPayload() {
        return {
            status: this.status,
            hasQR: this.status === 'qr' && Boolean(this.currentQR),
        };
    }

  async connect() {
        if (this._connecting) {
            console.log('⏳ Conexão já em andamento...');
            return;
        }

        if (this.sock && this.status === 'online') {
            console.log('✅ Bot já está online.');
            return;
        }

        this.manualDisconnect = false;
        this.autoReconnect = true;
        this._connecting = true;
        this.setStatus('connecting');
        console.log('🔌 Iniciando conexão Baileys...');

        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                browser: ['ARC-Bot', 'Chrome', '1.0.0'],
            });

            this.sock = sock;
            sock.ev.on('creds.update', saveCreds);
            this._bindEvents(sock);
        } catch (err) {
            this.setStatus('disconnected');
            console.error('❌ Falha ao conectar:', err.message);
            throw err;
        } finally {
            this._connecting = false;
        }
    }

    _bindEvents(sock) {
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.currentQR = qr;
                this.setStatus('qr');
                console.log('📱 QR Code gerado — escaneie pelo painel web.');
            }

            if (connection === 'open') {
                this.setStatus('online');
                console.log('✅ BOT CONECTADO E PRONTO!');
                console.log('📡 Aguardando comandos no WhatsApp...');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const loggedOut = statusCode === DisconnectReason.loggedOut;

                console.log(`🔌 Conexão fechada. Motivo: ${statusCode ?? 'desconhecido'}`);

                this.sock = null;
                this.setStatus('disconnected');

                if (loggedOut) {
                    console.log('🚪 Sessão encerrada (logout).');
                    return;
                }

                if (this.autoReconnect && !this.manualDisconnect) {
                    console.log('🔄 Tentando reconectar em 5s...');
                    this._scheduleReconnect(5000);
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            const msg = messages[0];
            if (!msg?.message || msg.key.fromMe) return;
            await CommandHandler.process(sock, msg);
        });
    }

    _scheduleReconnect(delayMs) {
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
        }
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            if (!this.manualDisconnect && this.autoReconnect) {
                this.connect().catch((err) => {
                    console.error('❌ Reconexão falhou:', err.message);
                });
            }
        }, delayMs);
    }

    async disconnect() {
        this.manualDisconnect = true;
        this.autoReconnect = false;

        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }

        const sock = this.sock;
        this.sock = null;

        if (sock) {
            try {
                sock.ev.removeAllListeners('connection.update');
                sock.ev.removeAllListeners('messages.upsert');
                await sock.end(undefined);
                console.log('🔴 Socket WhatsApp encerrado com sucesso.');
            } catch (err) {
                console.error('⚠️ Erro ao encerrar socket:', err.message);
            }
        }

        this.setStatus('disconnected');
        console.log('⏹️ Bot desconectado manualmente.');
    }

    async restart() {
        console.log('♻️ Reiniciando conexão...');
        await this.disconnect();
        this.manualDisconnect = false;
        this.autoReconnect = true;
        await this.connect();
    }

    /**
     * Remove credenciais corrompidas (erro 401) e força novo QR.
     */
    async repairCache() {
        console.log('🧹 Reparar Cache: desconectando e limpando pasta auth...');
        await this.disconnect();

        try {
            await fs.access(AUTH_DIR);
            await fs.rm(AUTH_DIR, { recursive: true, force: true });
            console.log(`🗑️ Pasta de autenticação removida: ${AUTH_DIR}`);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log('ℹ️ Pasta auth não existia — nada a remover.');
            } else if (err.code === 'EACCES' || err.code === 'EPERM') {
                const msg =
                    'Permissão negada ao apagar a pasta auth. Execute com permissões adequadas ou remova manualmente.';
                console.error(`❌ ${msg}`);
                throw new Error(msg);
            } else {
                console.error('❌ Erro ao apagar cache:', err.message);
                throw err;
            }
        }

        await fs.mkdir(AUTH_DIR, { recursive: true });
        this.manualDisconnect = false;
        this.autoReconnect = true;
        await this.connect();
        console.log('✨ Cache reparado — aguardando novo QR Code.');
    }

    getQRString() {
        return this.currentQR;
    }
}

export const botManager = new BotManager();

/** Compatibilidade com bot.js legado */
export async function startWhatsApp() {
    return botManager.connect();
}
