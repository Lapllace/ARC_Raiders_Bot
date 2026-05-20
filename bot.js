import 'dotenv/config';
import { setupLogBuffer } from './services/log-buffer.service.js';
import { botManager } from './services/bot-manager.service.js';
import { startDashboard } from './site/server.js';

setupLogBuffer();

console.log('🛡️ Iniciando Kernel do ARC-Bot...');

process.on('uncaughtException', (err) => console.error('🔥 Erro Crítico:', err.message));
process.on('unhandledRejection', (reason) => console.error('🌊 Rejeição não tratada:', reason));

startDashboard()
    .then(() => {
        if (process.env.AUTO_CONNECT !== 'false') {
            return botManager.connect();
        }
    })
    .catch((err) => {
        console.error('❌ Falha fatal na inicialização:', err);
    });
