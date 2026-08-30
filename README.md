# 🛡️ ARC-Bot & Tactical Dashboard

> Bot autônomo para WhatsApp integrado à API do jogo ARC Raiders com Inteligência Artificial (Google Gemini) e Painel Web de Controle.

![Badge Node.js](https://img.shields.io/badge/Node.js-v20-green)
![Badge Docker](https://img.shields.io/badge/Docker-Containers-blue)
![Badge Baileys](https://img.shields.io/badge/Baileys-WhatsApp_API-brightgreen)
![Badge Gemini](https://img.shields.io/badge/Google_Gemini-AI_Engine-orange)

## 📌 Sobre o Projeto
O **ARC-Bot** é uma solução completa desenvolvida para automatizar e auxiliar comunidades de jogos (Squads). Ele monitora o estado dos servidores e mapas do jogo em tempo real e utiliza IA Generativa contextualizada com os dados do radar para responder dúvidas táticas dos usuários via WhatsApp.

Acompanha um **Dashboard Web Cyberpunk** integrado, permitindo gerenciamento à distância (ligar/desligar, reparar sessão, monitorar logs e visualizar QR Code).

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js (ESM), Express.
- **WhatsApp Integration:** `@whiskeysockets/baileys` (Multi-device, sessão persistente).
- **Inteligência Artificial:** `@google/generative-ai` (Gemini API com Engenharia de Prompt e leitura de contexto).
- **Frontend / Painel Web:** HTML5, CSS3 (Tailwind CSS Dark Mode), JavaScript Vanilla, WebSockets/Fetch API.
- **DevOps & Deploy:** Docker, Docker Compose, Linux (Servidor caseiro/Umbrel), Tailscale (Rede privada).

---

## ✨ Principais Funcionalidades

1. **Radar em Tempo Real:** Consulta endpoints da Metaforge para monitorar invasões e eventos nos mapas.
2. **Córtex de IA Tática:** Responde menções no WhatsApp com dicas e builds baseadas na situação atual dos eventos do jogo.
3. **Gerenciamento de Conexão Independente:** Mantém a sessão do WhatsApp ativa no servidor sem depender do celular conectado à internet.
4. **Painel Web de Controle:**
   - Visualização e escaneamento do QR Code diretamente no navegador.
   - Terminal de logs em tempo real.
   - Botões de ação rápida (*Conectar, Desconectar, Atualizar Bot, Reparar Cache 401/440*).

---

## 📷 Screenshots / Demonstração
*(Adicione aqui fotos ou GIFs do Painel Web funcionando e prints do bot respondendo no WhatsApp)*

---

## 👷 Autor
Desenvolvido por **Alisson Barbosa (Teus)**.

# ARC Raiders WhatsApp Bot Professional

## 🚀 Instalação
1. Extraia o ZIP.
2. `npm install`
3. `npm start` ou `docker-compose up -d`

## 🖥️ Painel Web (Dashboard)
- URL: **http://localhost:3000** (porta configurável via `DASHBOARD_PORT`)
- `npm start` — inicia o bot + painel integrados
- `npm run dashboard` — apenas o painel (conexão manual ou `AUTO_CONNECT=true`)
- `AUTO_CONNECT=false` — painel sobe sem conectar o WhatsApp automaticamente

## 🤖 Comandos WhatsApp
- `!eventos`: Eventos atuais.
- `!previsao`: Próximos eventos.
- `!status`: Status do bot.
