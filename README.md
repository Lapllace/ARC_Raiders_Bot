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
