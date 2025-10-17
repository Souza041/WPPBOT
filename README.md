# Sistema de Chatbot WhatsApp com Rastreamento SSW

Um chatbot inteligente de atendimento via WhatsApp que integra com as APIs da SSW para rastreamento de encomendas, incluindo dashboard de análise.

## 🚀 Características

- **Bot WhatsApp** com Baileys para atendimento automatizado
- **Integração com APIs SSW** para rastreamento por DANFE e CPF
- **IA conversacional** para atendimento natural
- **Sistema de avaliação** para feedback dos usuários
- **Dashboard interativo** com gráficos e análises
- **Banco de dados MariaDB** para logs e histórico
- **API REST** para integração com o dashboard

## 📁 Estrutura do Projeto

```
├── bot/                    # Servidor do WhatsApp Bot (Node.js)
│   ├── src/
│   │   ├── controllers/    # Controladores de mensagens
│   │   ├── services/       # Serviços (SSW API, Database, etc.)
│   │   ├── models/         # Modelos do banco de dados
│   │   └── utils/          # Utilitários
│   └── auth/              # Dados de autenticação do WhatsApp
├── dashboard/             # Dashboard React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas do dashboard
│   │   └── hooks/         # Hooks customizados
└── README.md
```

## 🛠️ Instalação

### Pré-requisitos

- Node.js 18+ 
- MariaDB 10+
- Git

### 1. Clone o repositório

```bash
git clone <repository-url>
cd newbotwpp
```

### 2. Configurar o Bot WhatsApp

```bash
cd bot
npm install
```

Copie e configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# WhatsApp Bot Configuration
BOT_PORT=3001
BOT_NAME="Assistente Virtual"

# SSW API Configuration
SSW_DOMAIN="TES"
SSW_USERNAME="sswlogin"
SSW_PASSWORD="swordfish"
SSW_API_BASE_URL="https://ssw.inf.br/api"

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatsapp_bot
DB_USER=root
DB_PASSWORD=sua_senha_mysql

# Support Configuration
SUPPORT_NUMBER="5511999999999"
```

### 3. Configurar o Dashboard

```bash
cd ../dashboard
npm install
```

Copie e configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
VITE_API_BASE_URL=http://localhost:3002
VITE_APP_NAME="Dashboard de Atendimentos"
VITE_COMPANY_NAME="Sistema de Rastreamento"
```

### 4. Configurar Banco de Dados

**Opção 1 - Script Automático (Recomendado):**
```bash
setup-database.bat
```

**Opção 2 - Configuração Manual:**

Certifique-se de que o MariaDB está rodando e execute no MySQL/MariaDB:

```sql
-- Configurar autenticação nativa (resolve erro auth_gssapi_client)
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'sua_senha_aqui';

-- Criar banco de dados
CREATE DATABASE whatsapp_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Aplicar mudanças
FLUSH PRIVILEGES;
```

**⚠️ Importante:** Se você receber o erro `auth_gssapi_client`, significa que o MariaDB está configurado para usar autenticação Kerberos. Execute o comando `ALTER USER` acima para usar autenticação por senha nativa.

### 5. Iniciar os Serviços

**Terminal 1 - Bot WhatsApp:**
```bash
cd bot
npm run dev
```

**Terminal 2 - Dashboard:**
```bash
cd dashboard
npm run dev
```

## 📱 Primeira Configuração

1. Execute o bot: `cd bot && npm start`
2. Escaneie o QR Code que aparece no terminal com o WhatsApp
3. O bot ficará online e pronto para atender
4. Acesse o dashboard em `http://localhost:3000`

## 💬 Como Usar o Bot

### Fluxo de Conversa

1. **Primeira interação do dia**: O bot envia mensagem de boas-vindas
2. **Menu principal**:
   - 1️⃣ Rastreio DANFE
   - 2️⃣ Rastreio Destinatário (CPF)
   - 3️⃣ Falar com atendente
   - 4️⃣ Encerrar Atendimento

### Rastreamento DANFE
- Usuário escolhe opção 1
- Bot solicita chave DANFE (44 dígitos)
- Bot consulta API SSW e retorna informações

### Rastreamento por CPF
- Usuário escolhe opção 2  
- Bot solicita CPF (11 dígitos)
- Bot consulta API SSW e retorna informações

### Sistema de Avaliação
- Ao encerrar atendimento, bot solicita avaliação (1-5 estrelas)
- Avaliações são salvas no banco para análise

## 📊 Dashboard

Acesse `http://localhost:3000` para ver:

- **Dashboard**: Visão geral com estatísticas
- **Conversas**: Histórico de conversas
- **Rastreamentos**: Análise de rastreamentos por cidade, remetente, etc.
- **Análises**: Gráficos de performance e tendências

## 🔧 APIs Integradas

### SSW Tracking APIs

**Rastreio por DANFE:**
```javascript
POST https://ssw.inf.br/api/trackingdanfe
{
  "chave_nfe": "43160400850257000132550010000083991000083990"
}
```

**Rastreio por CPF:**
```javascript
POST https://ssw.inf.br/api/trackingpf
{
  "dominio": "TES",
  "usuario": "sswlogin", 
  "senha": "swordfish",
  "cpf": "02602602655"
}
```

## 🗃️ Banco de Dados

### Tabelas Principais

- `conversations`: Histórico de conversas
- `messages`: Log de mensagens
- `tracking_requests`: Histórico de rastreamentos
- `daily_interactions`: Controle de interações diárias
- `system_logs`: Logs do sistema

## 🚨 Tratamento de Erros

- **"Acesso inválido"**: Envia alerta para número de suporte
- **"Nenhum documento localizado"**: Retorna mensagem explicativa
- **Timeout**: Conversas são encerradas automaticamente após 5min de inatividade

## 🔒 Segurança

- Validação de CPF com dígitos verificadores
- Validação de chave DANFE (44 dígitos)
- Sanitização de inputs
- Rate limiting implícito através do WhatsApp

## 📈 Monitoramento

- Logs detalhados no console
- Banco de dados com histórico completo
- Dashboard com métricas em tempo real
- Sistema de saúde da API

## 🛠️ Desenvolvimento

### Scripts Disponíveis

**Bot:**
- `npm start`: Inicia o bot em produção
- `npm run dev`: Inicia em modo desenvolvimento
- `npm test`: Executa testes

**Dashboard:**
- `npm run dev`: Servidor de desenvolvimento
- `npm run build`: Build de produção
- `npm run preview`: Preview do build

### Estrutura de Logs

```javascript
// Exemplo de log de conversa
{
  "phone_number": "5511999999999",
  "protocol_id": "20250830-142530-ABC123DE",
  "service_type": "danfe",
  "rating": 5,
  "created_at": "2025-08-30T14:25:30Z"
}
```

## 🆘 Solução de Problemas

### Bot não conecta
1. Verifique se o QR code foi escaneado
2. Confirme se o WhatsApp está ativo no celular
3. Verifique logs de erro no console

### Erro de banco de dados

**Erro `auth_gssapi_client` ou `unknown plugin`:**
```bash
# Execute no MariaDB/MySQL como root:
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'sua_senha';
FLUSH PRIVILEGES;
```

**Outros erros de conexão:**
1. Confirme se o MariaDB está rodando
2. Verifique credenciais no `.env`
3. Execute `setup-database.bat` para configurar automaticamente
4. Confirme se o banco foi criado

### APIs SSW não respondem
1. Verifique credenciais SSW no `.env`
2. Teste conectividade com as APIs
3. Veja logs de erro para detalhes

### Dashboard não carrega dados
1. Confirme se o bot está rodando na porta 3001
2. Verifique se as APIs estão respondendo
3. Abra ferramentas de desenvolvedor para erros

## 📞 Suporte

Para problemas ou dúvidas, verifique:
1. Logs do console para erros detalhados
2. Status das conexões de banco e APIs
3. Configurações nos arquivos `.env`

## 📄 Licença

MIT License - veja arquivo LICENSE para detalhes.
