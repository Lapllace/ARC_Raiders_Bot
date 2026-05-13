import { ApiService } from '../services/api.service.js';

export class CommandHandler {
    static async process(sock, msg) {
        const userId = msg.key.remoteJid;

        // Extrator de texto ultra-sensível
        const text = (
            msg.message?.conversation || 
            msg.message?.extendedTextMessage?.text || 
            msg.message?.imageMessage?.caption || 
            msg.message?.videoMessage?.caption || 
            msg.message?.buttonsResponseMessage?.selectedButtonId ||
            ""
        ).trim();

        // Log no terminal para você ver a mensagem chegando
        if (text.length > 0) {
            console.log(`📩 Mensagem de [${userId.split('@')[0]}]: "${text}"`);
        }

        // Se não começar com !, ignora
        if (!text.startsWith('!')) return;

        const command = text.split(' ')[0].toLowerCase().substring(1);
        console.log(`🚀 Executando comando: !${command}`);

        try {
            switch (command) {
                
                case 'ajuda':
                case 'help':
                    await sock.sendMessage(userId, { 
                    text: "🤖 *SISTEMA DE MONITORAMENTO ARC*\n\n" +
                        "Comandos:\n" +
                        "👉 *!eventos* - Ver invasões ativas agora\n" +
                        "👉 *!previsao* - Horários das próximas invasões\n" +
                        "👉 *!status* - Verificar se o bot está operante"
                    });
                    break;

                case 'eventos':
                    const info = await ApiService.getEvents();
                    await sock.sendMessage(userId, { text: info });
                    break;

                case 'previsao':
                    const prev = await ApiService.getNextEvents();
                    await sock.sendMessage(userId, { text: prev });
                    break;

                case 'status':
                    const uptime = Math.floor(process.uptime() / 60);
                    await sock.sendMessage(userId, { 
                        text: `🟢 *SISTEMA OPERACIONAL OK*\n⏱️ Uptime: ${uptime} min\n📡 Radar: Sincronizado` 
                    });
                    break;

                default:
                    console.log(`❓ Comando desconhecido: !${command}`);
            }
        } catch (err) {
            console.error('❌ Erro no processamento:', err.message);
        }
    }
}