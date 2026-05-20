import axios from 'axios';
import { MAP_NAMES } from '../config/constants.js';

export class ApiService {
    static async getEvents() {
        try {
            const { data } = await axios.get(process.env.API_URL, { 
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            // A API retorna a lista em data.data
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

        // Filtra apenas eventos que estão acontecendo EXATAMENTE AGORA
        const eventosAtivos = events.filter(e => agora >= e.startTime && agora <= e.endTime);

        eventosAtivos.forEach(evento => {
            found = true;
            
            // Tradução dos mapas (Ponto 3)
            const traducoesMapas = {
                'Buried City': 'Cidade Soterrada',
                'Stella Montis': 'Stella Montis',
                'Blue Gate': 'Portão Azul',
                'Spaceport': 'Espaçoporto',
                'Riven Tides': 'Marés de Riven',
                'Dam': 'Represa'
            };
            const nomeMapa = traducoesMapas[evento.map] || MAP_NAMES[evento.map] || evento.map;
            
            // Lógica de tempo inteligente (Ponto 3)
            const tempoRestanteMs = evento.endTime - agora;
            const tempoTexto = this.formatarTempoRestante(tempoRestanteMs);

            text += `📍 *${nomeMapa}*\n`;
            text += `Evento⛰️: _${this.traduzirEvento(evento.name)}_\n`;
            text += `⏳ ${tempoTexto}\n\n`;
        });

        if (!found) {
            return "🛰️ *RADAR ARC RAIDERS*\n\n✅ Nenhuma invasão detectada nos mapas agora. Atmosfera limpa!";
        }

        text += "_Fique atento aos céus, Raider._";
        return text;
    }

    // Função de tempo com singular/plural e minutos (Ponto 3)
    static formatarTempoRestante(ms) {
        const totalMinutos = Math.floor(ms / 60000);
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;

        if (horas >= 2) {
            return `Acaba em ${horas} horas e ${minutos} minutos⏳`;
        } else if (horas === 1) {
            return `Acaba em 1 hora e ${minutos} minutos⏳`;
        } else {
            return `Acaba em ${minutos} minutos⏳`;
        }
    }

    static traduzirEvento(name) {
        const dicio = {
            'Harvester': 'Colhedor',
            'Night Raid': 'Incursão Noturna',
            'Close Scrutiny': 'Vigilância Estreita',
            'Lush Blooms': 'Flores Exuberantes',
            'Electromagnetic Storm': 'Tempestade Eletromagnética',
            'Hurricane': 'Furacão',
            'Matriarch': 'Matriarca',
            'Beachcombing': 'Varredura de Praia',
            'Bird City': 'Cidade dos Pássaros',
            'Uncovered Caches': 'Suprimentos Expostos',
            'Launch Tower Loot': 'Saque da Torre de Lançamento'
        };
        return dicio[name] || name;
    }

    static getMapTranslations() {
        return {
            'Buried City': 'Cidade Soterrada',
            'Stella Montis': 'Stella Montis',
            'Blue Gate': 'Portão Azul',
            'Spaceport': 'Espaçoporto',
            'Riven Tides': 'Marés de Riven',
            'Dam': 'Represa',
        };
    }

    /**
     * Dados estruturados para o painel "Radar de Speranza".
     */
    static async getDashboardRadar() {
        const traducoesMapas = this.getMapTranslations();
        const allMaps = Object.values(traducoesMapas);

        try {
            const { data } = await axios.get(process.env.API_URL, {
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });

            if (!data?.data?.length) {
                return {
                    calm: true,
                    invasions: [],
                    maps: allMaps.map((name) => ({ name, invaded: false })),
                    message: 'Speranza em calmaria. Nenhuma invasão detectada.',
                    updatedAt: Date.now(),
                };
            }

            const agora = Date.now();
            const eventosAtivos = data.data.filter(
                (e) => agora >= e.startTime && agora <= e.endTime
            );

            const invadedNames = new Set();
            const invasions = eventosAtivos.map((evento) => {
                const nomeMapa =
                    traducoesMapas[evento.map] || MAP_NAMES[evento.map] || evento.map;
                invadedNames.add(nomeMapa);
                return {
                    map: nomeMapa,
                    mapRaw: evento.map,
                    event: this.traduzirEvento(evento.name),
                    eventRaw: evento.name,
                    timeRemaining: this.formatarTempoRestante(evento.endTime - agora),
                    endsAt: evento.endTime,
                };
            });

            const maps = allMaps.map((name) => ({
                name,
                invaded: invadedNames.has(name),
            }));

            return {
                calm: invasions.length === 0,
                invasions,
                maps,
                message:
                    invasions.length === 0
                        ? 'Nenhuma invasão ativa nos mapas monitorados.'
                        : `${invasions.length} invasão(ões) em andamento.`,
                updatedAt: agora,
            };
        } catch (error) {
            console.error('> ❌ Erro na API (radar painel):', error.message);
            return {
                calm: false,
                invasions: [],
                maps: allMaps.map((name) => ({ name, invaded: false })),
                error: 'Falha ao sincronizar com o satélite de monitoramento.',
                updatedAt: Date.now(),
            };
        }
    }

    static async getNextEvents() {
        try {
            const { data } = await axios.get(process.env.API_URL, { timeout: 10000 });
            if (!data || !data.data) return "ℹ️ Sem previsões disponíveis.";

            const agora = Date.now();
            const proximos = data.data
                .filter(e => e.startTime > agora)
                .sort((a, b) => a.startTime - b.startTime)
                .slice(0, 5);

            let text = "📅 *PRÓXIMAS INVASÕES*\n\n";
            proximos.forEach(e => {
                const horaInicio = new Date(e.startTime).toLocaleTimeString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                text += `🔹 *${horaInicio}* - ${e.map}\n   _${this.traduzirEvento(e.name)}_\n\n`;
            });
            return proximos.length > 0 ? text : "ℹ️ Nenhuma previsão.";
        } catch (e) { return "❌ Erro ao buscar cronograma."; }
    }
}