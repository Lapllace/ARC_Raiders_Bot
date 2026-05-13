import 'dotenv/config';
import { startWhatsApp } from './services/whatsapp.service.js';

console.log('🛡️ Iniciando Kernel do ARC-Bot...');

// Prevenção de crashes globais
process.on('uncaughtException', (err) => console.error('🔥 Erro Crítico:', err.message));
process.on('unhandledRejection', (reason) => console.error('🌊 Rejeição não tratada:', reason));

startWhatsApp().catch(err => {
    console.error('❌ Falha fatal na inicialização:', err);
});
