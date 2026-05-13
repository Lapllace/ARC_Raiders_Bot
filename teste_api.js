import axios from 'axios';
import 'dotenv/config';

async function testarConexao() {
    console.log('📡 Tentando conectar em:', process.env.API_URL);
    
    try {
        const response = await axios.get(process.env.API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        console.log('\n✅ RESPOSTA RECEBIDA!');
        console.log('------------------------------------');
        // Isso vai mostrar a estrutura real do objeto no seu terminal
        console.dir(response.data, { depth: null }); 
        console.log('------------------------------------');

        const data = response.data;
        if (typeof data === 'object') {
            const chaves = Object.keys(data);
            console.log(`🔍 Mapas encontrados na API: ${chaves.join(', ')}`);
            
            chaves.forEach(mapa => {
                if (data[mapa].current) {
                    console.log(`⚠️ EVENTO ATIVO em ${mapa}: ${data[mapa].current.name}`);
                } else {
                    console.log(` leaf_green_check: ${mapa} está limpo.`);
                }
            });
        }

    } catch (error) {
        console.error('❌ ERRO NA CHAMADA:', error.message);
        if (error.response) {
            console.log('Status do Erro:', error.response.status);
        }
    }
}

testarConexao();