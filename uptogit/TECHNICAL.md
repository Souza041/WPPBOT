# Documentação Técnica - Sistema WhatsApp Bot

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Node.js Bot   │    │   MariaDB       │
│   (Baileys)     │◄──►│   (Express)     │◄──►│   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   SSW APIs      │    │   React         │
                       │   (Tracking)    │    │   Dashboard     │
                       └─────────────────┘    └─────────────────┘
```

## 📡 APIs e Integrações

### WhatsApp Web API (Baileys)

**Conexão:**
```javascript
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')

const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
})
```

**Eventos:**
- `connection.update`: Status da conexão
- `creds.update`: Atualização de credenciais
- `messages.upsert`: Recebimento de mensagens

### SSW Tracking APIs

**Base URL:** `https://ssw.inf.br/api`

**Endpoints:**
- `POST /trackingdanfe`: Rastreio por chave DANFE
- `POST /trackingpf`: Rastreio por CPF

**Autenticação:**
- DANFE: Sem autenticação (apenas chave)
- CPF: Domínio, usuário e senha

### Internal REST API

**Base URL:** `http://localhost:3001/api`

**Endpoints:**
- `GET /stats`: Estatísticas gerais
- `GET /conversations`: Lista de conversas com filtros
- `GET /tracking-data`: Dados de rastreamento com filtros

## 💾 Banco de Dados

### Schema Principal

```sql
-- Conversas
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) NOT NULL,
    protocol_id VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('active', 'waiting_attendant', 'ending', 'completed') DEFAULT 'active',
    service_type VARCHAR(20),
    awaiting_input VARCHAR(50),
    rating INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL
);

-- Mensagens
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) NOT NULL,
    conversation_id INT,
    message TEXT NOT NULL,
    is_from_bot BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- Rastreamentos
CREATE TABLE tracking_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT,
    tracking_type ENUM('danfe', 'cpf') NOT NULL,
    tracking_value VARCHAR(50) NOT NULL,
    result JSON,
    success BOOLEAN DEFAULT FALSE,
    city VARCHAR(100),
    sender VARCHAR(200),
    nf VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Interações diárias
CREATE TABLE daily_interactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) NOT NULL,
    interaction_date DATE NOT NULL,
    first_interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_messages INT DEFAULT 1,
    UNIQUE KEY unique_phone_date (phone_number, interaction_date)
);
```

### Índices Otimizados

```sql
-- Conversas
CREATE INDEX idx_phone_number ON conversations (phone_number);
CREATE INDEX idx_protocol_id ON conversations (protocol_id);
CREATE INDEX idx_status ON conversations (status);
CREATE INDEX idx_created_at ON conversations (created_at);

-- Mensagens
CREATE INDEX idx_phone_number ON messages (phone_number);
CREATE INDEX idx_conversation_id ON messages (conversation_id);
CREATE INDEX idx_timestamp ON messages (timestamp);

-- Rastreamentos
CREATE INDEX idx_conversation_id ON tracking_requests (conversation_id);
CREATE INDEX idx_tracking_type ON tracking_requests (tracking_type);
CREATE INDEX idx_tracking_value ON tracking_requests (tracking_value);
CREATE INDEX idx_created_at ON tracking_requests (created_at);
CREATE INDEX idx_city ON tracking_requests (city);
CREATE INDEX idx_sender ON tracking_requests (sender);
```

## 🔄 Fluxo de Dados

### 1. Recebimento de Mensagem

```javascript
// MessageController.js
sock.ev.on('messages.upsert', async (m) => {
    const message = m.messages[0];
    if (!message.key.fromMe && m.type === 'notify') {
        await this.messageController.handleMessage(this.sock, message);
    }
});
```

### 2. Processamento da Conversa

```javascript
// ConversationService.js
async processMessage(sock, phoneNumber, messageText, conversation) {
    // 1. Identificar contexto da conversa
    // 2. Processar comando/entrada
    // 3. Chamar serviço apropriado (SSW API)
    // 4. Formatar e enviar resposta
    // 5. Atualizar estado da conversa
    // 6. Registrar logs
}
```

### 3. Integração SSW

```javascript
// TrackingService.js
async trackByDanfe(danfeKey) {
    const response = await axios.post(`${this.apiBaseUrl}/trackingdanfe`, {
        chave_nfe: danfeKey
    });
    
    return this.parseTrackingResponse(response.data);
}
```

### 4. Persistência

```javascript
// DatabaseService.js
static async logTracking(trackingData) {
    const [result] = await connection.execute(
        'INSERT INTO tracking_requests (...) VALUES (...)',
        [...]
    );
    return result.insertId;
}
```

## 🧠 Lógica de Conversação

### Estados da Conversa

```javascript
const conversationStates = {
    'active': 'Conversa ativa, aguardando comando',
    'waiting_attendant': 'Usuário solicitou atendente humano',
    'ending': 'Conversa finalizando, aguardando avaliação',
    'completed': 'Conversa concluída'
};
```

### Máquina de Estados

```
[START] → [WELCOME] → [MENU]
                       ├── [DANFE_INPUT] → [TRACKING] → [RESULT]
                       ├── [CPF_INPUT] → [TRACKING] → [RESULT]  
                       ├── [ATTENDANT] → [WAITING]
                       └── [END] → [RATING] → [COMPLETED]
```

### Inputs Esperados

```javascript
const awaitingInputTypes = {
    'danfe_key': 'Aguardando chave DANFE (44 dígitos)',
    'cpf': 'Aguardando CPF (11 dígitos)', 
    'rating': 'Aguardando avaliação (1-5)',
    null: 'Não aguardando input específico'
};
```

## 📊 Dashboard Frontend

### Tecnologias

- **React 18**: Interface de usuário
- **Vite**: Build tool e dev server
- **Tailwind CSS**: Styling
- **Recharts**: Gráficos e visualizações
- **React Router**: Roteamento
- **Lucide React**: Ícones

### Estrutura de Componentes

```
src/
├── components/
│   ├── Sidebar.jsx      # Navegação lateral
│   ├── Header.jsx       # Cabeçalho com status
│   └── StatCard.jsx     # Cartões de estatística
├── pages/
│   ├── Dashboard.jsx    # Visão geral
│   ├── Conversations.jsx # Histórico de conversas
│   ├── Tracking.jsx     # Análise de rastreamentos
│   └── Analytics.jsx    # Análises avançadas
├── hooks/
│   └── useApi.js        # Hook para chamadas da API
└── utils/
    └── api.js           # Cliente Axios configurado
```

### Padrões de Dados

```javascript
// Hook para stats
const { data: stats, loading, error } = useStats();

// Estrutura de stats
{
    totalConversations: 150,
    conversationsToday: 12,
    totalTracking: 89,
    trackingToday: 8,
    averageRating: "4.2",
    ratingDistribution: [
        { rating: 5, count: 45 },
        { rating: 4, count: 30 },
        // ...
    ],
    serviceStats: [
        { service_type: "danfe", count: 55 },
        { service_type: "cpf", count: 34 }
    ]
}
```

## 🔒 Segurança e Validações

### Validação de Inputs

```javascript
// CPF com dígito verificador
function validateCpf(cpf) {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return false;
    
    // Algoritmo de validação CPF
    // ... implementação dos dígitos verificadores
}

// DANFE (44 dígitos numéricos)
function validateDanfeKey(key) {
    const cleanKey = key.replace(/\D/g, '');
    return cleanKey.length === 44;
}
```

### Sanitização

```javascript
// Limpeza de mensagens
function cleanMessageText(text) {
    return text
        .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]/gu, '') // Remove emojis
        .replace(/\s+/g, ' ') // Normaliza espaços
        .trim();
}
```

### Rate Limiting

- **WhatsApp nativo**: Limite natural da API
- **Database**: Connection pooling
- **Memory**: Garbage collection automático

## 🚨 Error Handling

### Padrão de Tratamento

```javascript
try {
    const result = await TrackingService.trackByDanfe(danfeKey);
    await this.sendTrackingResult(sock, phoneNumber, result);
} catch (error) {
    console.error('Error tracking DANFE:', error);
    await this.sendMessage(sock, phoneNumber, 
        '❌ Erro ao consultar rastreamento. Tente novamente mais tarde.');
}
```

### Tipos de Erro

1. **Conexão SSW**: Timeout, network error
2. **Dados inválidos**: CPF/DANFE incorretos
3. **Database**: Connection lost, query error
4. **WhatsApp**: Disconnection, send failure

### Recovery Strategies

```javascript
// Retry com backoff exponencial
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = baseDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }
}
```

## 📈 Performance

### Otimizações Backend

- **Connection Pooling**: MySQL2 com pool
- **Async/Await**: Non-blocking operations
- **Indexação**: Queries otimizadas
- **Cleanup**: Auto-limpeza de dados antigos

### Otimizações Frontend

- **Code Splitting**: Lazy loading de páginas
- **Memoização**: React.memo para componentes
- **Virtualização**: Para listas grandes
- **Bundle Optimization**: Tree shaking

### Métricas de Monitoramento

```javascript
// Exemplo de métricas coletadas
{
    response_time_api: "150ms",
    db_connection_pool: "active: 2/10",
    whatsapp_connection: "connected",
    memory_usage: "45MB",
    active_conversations: 12
}
```

## 🔧 Configuração de Produção

### Variáveis de Ambiente

```env
# Produção
NODE_ENV=production
BOT_PORT=3001
DB_HOST=mysql-server.local
DB_USER=whatsapp_bot_user
DB_PASSWORD=secure_password

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/whatsapp-bot.log

# Monitoring
HEALTH_CHECK_PORT=3002
METRICS_ENABLED=true
```

### Docker Setup

```dockerfile
# Dockerfile para o bot
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Process Management

```javascript
// PM2 ecosystem
module.exports = {
    apps: [{
        name: 'whatsapp-bot',
        script: 'src/index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '200M',
        env: {
            NODE_ENV: 'production'
        }
    }]
};
```

## 🧪 Testes

### Estrutura de Testes

```javascript
// __tests__/TrackingService.test.js
describe('TrackingService', () => {
    test('should validate DANFE key correctly', () => {
        const validKey = '43160400850257000132550010000083991000083990';
        expect(TrackingService.validateDanfeKey(validKey)).toBe(true);
    });
    
    test('should parse SSW response correctly', async () => {
        const mockResponse = { /* mock data */ };
        const result = await TrackingService.parseTrackingResponse(mockResponse);
        expect(result.success).toBe(true);
    });
});
```

### Tipos de Teste

1. **Unit**: Serviços individuais
2. **Integration**: APIs e database
3. **E2E**: Fluxo completo de conversa
4. **Load**: Performance sob carga

## 📋 Checklist de Deploy

- [ ] Configurar variáveis de ambiente
- [ ] Setup banco de dados em produção
- [ ] Configurar SSL/HTTPS
- [ ] Setup backup automático
- [ ] Configurar monitoring/logging
- [ ] Testar conectividade WhatsApp
- [ ] Validar APIs SSW em produção
- [ ] Setup process manager (PM2)
- [ ] Configurar reverse proxy (nginx)
- [ ] Documentar procedures de recovery

## 🔍 Debug e Troubleshooting

### Logs Importantes

```javascript
// Estrutura de log
{
    timestamp: "2025-08-30T14:25:30Z",
    level: "info|warning|error",
    message: "Detailed message",
    context: {
        phone_number: "5511999999999",
        conversation_id: 123,
        action: "tracking_danfe",
        data: { /* relevant data */ }
    }
}
```

### Comandos de Debug

```bash
# Ver logs em tempo real
tail -f /var/log/whatsapp-bot.log

# Verificar status do banco
mysql -u root -p -e "SHOW PROCESSLIST;"

# Monitorar memória
ps aux | grep node

# Verificar portas
netstat -tlnp | grep 3001
```