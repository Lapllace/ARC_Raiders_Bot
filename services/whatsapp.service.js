import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { CommandHandler } from '../commands/handler.js';

export async function startWhatsApp() {
    // Busca a versão mais recente do WA para evitar desconexões
    const { version } = await fetchLatestBaileysVersion();
    
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['ARC-Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.clear();
            console.log('🚀 [ARC-BOT] ESCANEIE O QR CODE ABAIXO:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ BOT CONECTADO E PRONTO!');
            console.log('📡 Aguardando comandos no WhatsApp...');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`🔌 Conexão fechada. Motivo: ${statusCode}`);
            
            if (shouldReconnect) {
                console.log('🔄 Tentando reconectar...');
                setTimeout(startWhatsApp, 5000);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        
        if (!msg.message || msg.key.fromMe) return;

        // Repassa para o processador de comandos
        await CommandHandler.process(sock, msg);
    });

    return sock;
}