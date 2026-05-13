import axios from 'axios';
import { MAP_NAMES } from '../config/constants.js';

export class ApiService {
    static async getEvents() {
        try {
            const { data } = await axios.get(process.env.API_URL, { 
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            if (!data || !data.data || data.data.length === 0) {
                return "✅ *Speranza em Calmaria.* Nenhum evento detectado no radar.";
            }

            return this.parseEvents(data.data);
        } catch (error) {
            console.error('> ❌ Erro na API:', error.message);
            return "⚠️ *Erro:* Falha ao sincronizar com o satélite de monitoramento.";
        }
    }

    static parseEvents(events) {
        const agora = Date.now();
        let text = "🛰️ *RADAR ARC RAIDERS (PT-BR)*\n\n";
        let found = false;

        // Filtra apenas eventos onde o tempo atual está entre o início e o fim
        const eventosAtivos = events.filter(e => agora >= e.startTime && agora <= e.endTime);

        eventosAtivos.forEach(evento => {
            found = true;
            // Traduz o nome do mapa usando nossas constantes ou usa o nome original
            const nomeMapa = MAP_NAMES[evento.map] || 
                             Object.values(MAP_NAMES).find(v => v === evento.map) || 
                             evento.map;
            
            const horaFim = this.formatarHora(evento.endTime);

            text += `📍 *${nomeMapa}*\n`;
            text += `⚠️ Alerta: _${this.traduzirEvento(evento.name)}_\n`;
            text += `⏳ Término: *${horaFim}* (Horário de Brasília)\n\n`;
        });

        if (!found) {
            return "🛰️ *RADAR ARC RAIDERS*\n\n✅ Nenhuma invasão detectada nos mapas agora. Atmosfera limpa para exploração!";
        }

        text += "_Fique atento aos céus, Raider._";
        return text;
    }

    static async getNextEvents() {
        try {
            const { data } = await axios.get(process.env.API_URL, { timeout: 10000 });
            if (!data || !data.data) return "ℹ️ Sem previsões disponíveis.";

            const agora = Date.now();
            // Pega os próximos 5 eventos que ainda não começaram
            const proximos = data.data
                .filter(e => e.startTime > agora)
                .sort((a, b) => a.startTime - b.startTime)
                .slice(0, 5);

            let text = "📅 *PRÓXIMAS INVASÕES ARC*\n\n";
            
            proximos.forEach(e => {
                const nomeMapa = MAP_NAMES[e.map] || e.map;
                const horaInicio = this.formatarHora(e.startTime);
                text += `🔹 *${horaInicio}* - ${nomeMapa}\n   _${this.traduzirEvento(e.name)}_\n\n`;
            });

            return proximos.length > 0 ? text : "ℹ️ Nenhuma invasão prevista para as próximas horas.";
        } catch (e) { 
            return "❌ Erro ao buscar cronograma de incursões."; 
        }
    }

    // Utilitário para formatar 24h (Brasília)
    static formatarHora(timestamp) {
        return new Date(timestamp).toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // Tradutor de nomes de eventos
    static traduzirEvento(name) {
        const traducoes = {
            'Harvester': 'Ceifadora',
            'Night Raid': 'Incursão Noturna',
            'Close Scrutiny': 'Casamata',
            'Lush Blooms': 'Flores Exuberantes',
            'Electromagnetic Storm': 'Tempestade Eletromagnética',
            'Hurricane': 'Furacão',
            'Matriarch': 'Matriarca',
            'Beachcombing': 'Varredura de Praia',
            'Bird City': 'Cidade dos Pássaros',
            'Uncovered Caches': 'Suprimentos Expostos',
            'Launch Tower Loot': 'Saque da Torre de Lançamento',
            'Hidden Bunker': 'Bunker Escondido',
            'Locked Gate': 'Portão Trancado'
        };
        return traducoes[name] || name;
    }
}