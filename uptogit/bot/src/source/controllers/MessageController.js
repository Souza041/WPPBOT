const TrackingService = require('../services/TrackingService');
const DatabaseService = require('../services/DatabaseService');
const ConversationService = require('../services/ConversationService');
const { generateProtocolId, formatMessage, extractKeywords, getSupportNumber } = require('../utils/helpers');

class MessageController {
    constructor() {
        this.conversationService = new ConversationService();
    }

    async handleMessage(sock, message) {
        try {
            const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
            const messageText = message.message?.conversation ||  message.message?.extendedTextMessage?.text || '';

            if (!messageText) return;

            console.log(`📨 Message from ${phoneNumber}: ${messageText}`);

// 🔹 Intercepta comando de encerramento vindo do atendente
const ATTENDANT_NUMBER = '554198200712'; // número do atendente
if (phoneNumber === ATTENDANT_NUMBER && messageText.startsWith('!encerrar')) {
    const parts = messageText.trim().split(/\s+/);
    const targetNumber = parts[1]?.replace(/\D/g, '');

    if (!targetNumber) {
        await this.sendMessage(sock, ATTENDANT_NUMBER, '⚠️ Uso correto: !encerrar <número_do_cliente>');
        return;
    }

    const conversation = await this.conversationService.getActiveConversation(targetNumber);

    if (!conversation) {
        await this.sendMessage(sock, ATTENDANT_NUMBER, `⚠️ Nenhuma conversa ativa encontrada para *${targetNumber}*.`);
        return;
    }

    // usa a sua função handleEndConversation() 👇
    await this.handleEndConversation(sock, targetNumber, conversation);

    await this.sendMessage(sock, ATTENDANT_NUMBER, `✅ Atendimento com o número *${targetNumber}* foi encerrado e a enquete enviada.`);
    console.log(`✅ Atendimento ${targetNumber} encerrado via comando do atendente.`);
    return;
}
            
            
            // Log message
            await DatabaseService.logMessage({
                phone_number: phoneNumber,
                message: messageText,
                is_from_bot: false,
                timestamp: new Date()
            });

            // Get or create conversation
            let conversation = await this.conversationService.getActiveConversation(phoneNumber);
            let isNewConversation = false;
            
            if (!conversation) {
                // Create new conversation
                conversation = await this.conversationService.createConversation({
                    phone_number: phoneNumber,
                    protocol_id: generateProtocolId(),
                    status: 'active'
                });
                isNewConversation = true;
                
                // Check if it's first interaction today
                const isFirstToday = await this.conversationService.isFirstInteractionToday(phoneNumber);
                
                if (isFirstToday) {
                    await this.sendWelcomeMessage(sock, phoneNumber);
                    return; // Don't process message further, just send welcome
                }
            }

            // Update conversation activity
            await this.conversationService.updateActivity(conversation.id);

            // Process message based on conversation state
            await this.processMessage(sock, phoneNumber, messageText, conversation);

        } catch (error) {
            console.error('❌ Error handling message:', error);
            await this.sendErrorMessage(sock, message.key.remoteJid);
        }
    }

    async sendWelcomeMessage(sock, phoneNumber) {
        const welcomeMessage = formatMessage(`
👋 *Olá! Bem-vindo ao nosso atendimento automatizado.*

Escolha uma das opções de atendimento:
1️⃣ Rastreio DANFE
2️⃣ Rastreio Destinatário (pessoa física)
3️⃣ Falar com atendente
4️⃣ Encerrar Atendimento
        `);

        await this.sendMessage(sock, phoneNumber, welcomeMessage);
    }

    async processMessage(sock, phoneNumber, messageText, conversation) {
        const lowerMessage = messageText.toLowerCase().trim();

// 🔹 Bloco robusto para tratar "!encerrar"
if (lowerMessage.startsWith('!encerrar')) {
    const parts = messageText.trim().split(/\s+/);
    const rawTarget = parts[1] || '';
    const targetDigits = rawTarget.replace(/\D/g, '');

    if (!targetDigits) {
        await this.sendMessage(sock, phoneNumber, '⚠️ Uso correto: !encerrar <telefone_do_cliente>');
        return;
    }

    console.log(`🔔 Comando !encerrar recebido de ${phoneNumber} para ${targetDigits}`);

    // gera possíveis variantes para busca
    const variants = [
        targetDigits,
        targetDigits.replace(/^55/, ''),         // sem 55
        '55' + targetDigits.replace(/^55/, ''),  // com 55
        `${targetDigits}@s.whatsapp.net`,
        `${targetDigits.replace(/^55/, '')}@s.whatsapp.net`,
        `55${targetDigits}@s.whatsapp.net`
    ];

    let clientConversation = null;
    let usedVariant = null;

    // 1) tenta variants com getActiveConversation
    for (const v of variants) {
        try {
            if (typeof this.conversationService.getActiveConversation === 'function') {
                clientConversation = await this.conversationService.getActiveConversation(v);
                if (clientConversation) {
                    usedVariant = v;
                    console.log(`✅ Encontrou conversa por getActiveConversation com variante: ${v}`);
                    break;
                }
            }
        } catch (e) {
            console.warn(`⚠️ Erro em getActiveConversation(${v}):`, e && e.message ? e.message : e);
        }

        // tenta method alternativo getConversationByPhone (se existir)
        try {
            if (!clientConversation && typeof this.conversationService.getConversationByPhone === 'function') {
                clientConversation = await this.conversationService.getConversationByPhone(v);
                if (clientConversation) {
                    usedVariant = v;
                    console.log(`✅ Encontrou conversa por getConversationByPhone com variante: ${v}`);
                    break;
                }
            }
        } catch (e) {
            console.warn(`⚠️ Erro em getConversationByPhone(${v}):`, e && e.message ? e.message : e);
        }
    }

    // 2) Se não encontrou, tenta um fallback no DatabaseService (se disponível)
    if (!clientConversation) {
        try {
            if (typeof DatabaseService.findConversationByPhone === 'function') {
                clientConversation = await DatabaseService.findConversationByPhone(targetDigits);
                if (clientConversation) {
                    usedVariant = targetDigits;
                    console.log(`✅ Encontrou conversa por DatabaseService.findConversationByPhone`);
                }
            } else if (typeof DatabaseService.getConversations === 'function') {
                // tenta buscar conversas recentes (pode precisar ajustar o filtro conforme sua implementação)
                try {
                    const list = await DatabaseService.getConversations(1, 50, { phone: targetDigits });
                    if (Array.isArray(list) && list.length) {
                        clientConversation = list[0];
                        usedVariant = targetDigits;
                        console.log(`✅ Encontrou conversa por DatabaseService.getConversations (fallback)`);
                    }
                } catch (e) {
                    console.warn('⚠️ getConversations fallback falhou:', e && e.message ? e.message : e);
                }
            }
        } catch (e) {
            console.warn('⚠️ Erro ao usar DatabaseService para buscar conversa:', e && e.message ? e.message : e);
        }
    }

    if (!clientConversation) {
        const msg = `⚠️ Não foi possível localizar uma conversa ativa para o número *${targetDigits}*.\nVerifique o número ou pesquise no painel.`;
        await this.sendMessage(sock, phoneNumber, msg);
        console.log('❌ !encerrar: conversa não encontrada para', targetDigits);
        return;
    }

    // pronto: temos a conversa — agora encerra e envia enquete
    try {
        await this.conversationService.updateConversation(clientConversation.id, {
            status: 'ending',
            awaiting_input: 'rating'
        });

        const surveyMessage = formatMessage(`
🙏 *Atendimento encerrado!*

Como você avalia nossa experiência hoje?
⭐ Digite um número de 1 a 5 estrelas:

1️⃣ Muito insatisfeito  
2️⃣ Insatisfeito  
3️⃣ Regular  
4️⃣ Satisfeito  
5️⃣ Muito satisfeito
        `);

        // phone no objeto pode estar em clientConversation.phone_number ou só usar targetDigits
        const clientJid = (clientConversation.phone_number && clientConversation.phone_number.includes('@'))
            ? clientConversation.phone_number
            : `${clientConversation.phone_number || targetDigits}@s.whatsapp.net`;

        await this.sendMessage(sock, clientJid, surveyMessage);

        await this.sendMessage(sock, phoneNumber, `✅ Atendimento com o número *${targetDigits}* encerrado e enquete enviada.`);
        console.log(`✅ Atendimento encerrado com sucesso para ${targetDigits} (variant usada: ${usedVariant})`);
    } catch (err) {
    console.error('❌ Erro detalhado ao encerrar atendimento via comando:', err);
    await this.sendMessage(
        sock,
        phoneNumber,
        `❌ Erro ao encerrar atendimento: ${err?.message || err}`
    );
}

    return; // evita processamento adicional
}



        // If conversation is waiting for attendant, acknowledge but don't change state
        if (conversation.status === 'waiting_attendant') {
            const message = formatMessage(`
Sua mensagem foi registrada no protocolo *${conversation.protocol_id}*.
Um atendente entrará em contato em breve.

Digite *menu* para voltar ao atendimento automatizado.
            `);
            
            if (lowerMessage === 'menu') {
                await this.conversationService.updateConversation(conversation.id, {
                    status: 'active',
                    awaiting_input: null
                });
                await this.sendWelcomeMessage(sock, phoneNumber);
                return;
            }
            
            await this.sendMessage(sock, phoneNumber, message);
            return;
        }

        // Handle awaiting input first
        if (conversation.awaiting_input) {
            await this.handleAwaitingInput(sock, phoneNumber, messageText, conversation);
            return;
        }

        // Handle main menu options
        if (['1', 'rastreio danfe', 'danfe'].includes(lowerMessage)) {
            await this.handleDanfeOption(sock, phoneNumber, conversation);
        } else if (['2', 'rastreio destinatario', 'destinatario', 'cpf'].includes(lowerMessage)) {
            await this.handleCpfOption(sock, phoneNumber, conversation);
        } else if (['3', 'atendente', 'falar com atendente'].includes(lowerMessage)) {
            await this.handleAttendantOption(sock, phoneNumber, conversation);
        } else if (['4', 'encerrar', 'encerrar atendimento'].includes(lowerMessage)) {
            await this.handleEndConversation(sock, phoneNumber, conversation);
        } else {
            // AI Response for general questions
            await this.handleGeneralQuestion(sock, phoneNumber, messageText, conversation);
        }
    }

    async handleDanfeOption(sock, phoneNumber, conversation) {
        await this.conversationService.updateConversation(conversation.id, {
            awaiting_input: 'danfe_key',
            service_type: 'danfe'
        });

        const message = formatMessage(`
🔑 *Rastreio por DANFE*

Por favor, envie a chave da DANFE (44 dígitos) que deseja rastrear.

Exemplo: 43160400850257000132550010000083991000083990
        `);

        await this.sendMessage(sock, phoneNumber, message);
    }

    async handleCpfOption(sock, phoneNumber, conversation) {
        await this.conversationService.updateConversation(conversation.id, {
            awaiting_input: 'cpf',
            service_type: 'cpf'
        });

        const message = formatMessage(`
👤 *Rastreio por Destinatário*

Por favor, envie o CPF do destinatário (apenas números).

Exemplo: 02602602655
        `);

        await this.sendMessage(sock, phoneNumber, message);
    }

async handleAttendantOption(sock, phoneNumber, conversation) {
    const message = formatMessage(`
👨‍💼 *Falar com Atendente*

Em breve um de nossos atendentes entrará em contato com você.
Protocolo de atendimento: *${conversation.protocol_id}*

Aguarde um momento por favor...
    `);

    // Envia a mensagem ao cliente
    await this.sendMessage(sock, phoneNumber, message);

    // Atualiza status da conversa
    await this.conversationService.updateConversation(conversation.id, {
        status: 'waiting_attendant',
        notes: 'Cliente solicitou atendimento humano'
    });

    // 📩 Número do atendente (ou grupo)
    const ATTENDANT_TARGET = '554198200712@s.whatsapp.net';

// 🔗 Gera link clicável para o atendente
const BOT_NUMBER = '554187382675'; // número do bot (o que está logado no Baileys)
const waLink = `https://wa.me/${BOT_NUMBER}?text=!encerrar%20${phoneNumber}`;


const baseText = `📞 *Novo Atendimento Solicitado*\n\n📋 Protocolo: ${conversation.protocol_id}\n👤 Cliente: ${phoneNumber}\n\n👉 *Clique abaixo para encerrar o atendimento:*\n${waLink}`;

await sock.sendMessage(ATTENDANT_TARGET, { text: baseText });


    console.log('✅ Notificação enviada ao atendente (modo texto)');
}



    async handleAwaitingInput(sock, phoneNumber, messageText, conversation) {
        if (conversation.awaiting_input === 'danfe_key') {
            await this.processDanfeTracking(sock, phoneNumber, messageText, conversation);
        } else if (conversation.awaiting_input === 'cpf') {
            await this.processCpfTracking(sock, phoneNumber, messageText, conversation);
        } else if (conversation.awaiting_input === 'rating') {
            await this.processRating(sock, phoneNumber, messageText, conversation);
        }
    }

    async processDanfeTracking(sock, phoneNumber, danfeKey, conversation) {
        // Validate DANFE key format (44 digits)
        const cleanKey = danfeKey.replace(/\D/g, '');
        
        if (cleanKey.length !== 44) {
            const message = formatMessage(`
❌ *Chave DANFE inválida*

A chave deve conter exatamente 44 dígitos. Por favor, verifique e envie novamente.
            `);
            return await this.sendMessage(sock, phoneNumber, message);
        }

        await this.sendMessage(sock, phoneNumber, '🔍 Consultando rastreamento... Aguarde um momento.');

        try {
            const trackingResult = await TrackingService.trackByDanfe(cleanKey);
            
            // Log tracking request
            await DatabaseService.logTracking({
                conversation_id: conversation.id,
                tracking_type: 'danfe',
                tracking_value: cleanKey,
                result: JSON.stringify(trackingResult),
                success: trackingResult.success
            });

            await this.sendTrackingResult(sock, phoneNumber, trackingResult);
            
            // Only offer more help if successful or if it's a known error that doesn't need retry
            if (trackingResult.success || 
                trackingResult.message === 'Nenhum documento localizado' ||
                trackingResult.message === 'Acesso invalido') {
                await this.offerMoreHelp(sock, phoneNumber, conversation);
            }

        } catch (error) {
            console.error('Error tracking DANFE:', error);
            await this.sendMessage(sock, phoneNumber, '❌ Erro ao consultar rastreamento. Tente novamente mais tarde.');
        }

        // Clear awaiting input
        await this.conversationService.updateConversation(conversation.id, {
            awaiting_input: null
        });
    }

    async processCpfTracking(sock, phoneNumber, cpf, conversation) {
        // Validate CPF format
        const cleanCpf = cpf.replace(/\D/g, '');
        
        if (cleanCpf.length !== 11) {
            const message = formatMessage(`
❌ *CPF inválido*

O CPF deve conter 11 dígitos. Por favor, verifique e envie novamente.
            `);
            return await this.sendMessage(sock, phoneNumber, message);
        }

        await this.sendMessage(sock, phoneNumber, '🔍 Consultando rastreamento... Aguarde um momento.');

        try {
            const trackingResult = await TrackingService.trackByCpf(cleanCpf);
            
            // Log tracking request
            await DatabaseService.logTracking({
                conversation_id: conversation.id,
                tracking_type: 'cpf',
                tracking_value: cleanCpf,
                result: JSON.stringify(trackingResult),
                success: trackingResult.success
            });

            await this.sendTrackingResult(sock, phoneNumber, trackingResult);
            
            // Only offer more help if successful or if it's a known error that doesn't need retry
            if (trackingResult.success || 
                trackingResult.message === 'Nenhum documento localizado' ||
                trackingResult.message === 'Acesso invalido') {
                await this.offerMoreHelp(sock, phoneNumber, conversation);
            }

        } catch (error) {
            console.error('Error tracking CPF:', error);
            await this.sendMessage(sock, phoneNumber, '❌ Erro ao consultar rastreamento. Tente novamente mais tarde.');
        }

        // Clear awaiting input
        await this.conversationService.updateConversation(conversation.id, {
            awaiting_input: null
        });
    }

    async sendTrackingResult(sock, phoneNumber, result) {
        if (!result.success) {
            let message;
            
            if (result.message === 'Acesso invalido') {
                // Send alert to support
                const supportNumber = process.env.SUPPORT_NUMBER;
                if (supportNumber) {
                    await this.sendMessage(sock, supportNumber, 
                        `⚠️ *ALERTA DE SISTEMA*\n\nErro de Acesso Inválido na API SSW\n\nHorário: ${new Date().toLocaleString('pt-BR')}`);
                }
                message = formatMessage(`
❌ *Sistema de rastreamento indisponível*

Nossos serviços estão temporariamente em manutenção.
Tente novamente em alguns minutos.

Para urgências, digite *3* para falar com atendente.
                `);
            } else if (result.message === 'Nenhum documento localizado') {
                message = formatMessage(`
📋 *Documento não encontrado*

O número informado não foi localizado em nossa base de dados.

• Verifique se digitou corretamente
• Confirme se o documento está dentro do prazo de consulta
• Para mais informações, digite *3* para falar com atendente
                `);
            } else {
                message = `❌ *${result.message}*\n\nTente novamente ou digite *3* para falar com atendente.`;
            }
            
            return await this.sendMessage(sock, phoneNumber, message);
        }

        const data = result.data;
        let message = '';

        if (data.nf || data.remetente) {
            // SSW format or DANFE tracking result  
            const isDelivered = data.tipo === 'Entrega' || data.status.includes('ENTREGUE');
            
            message = formatMessage(`
📦 *Resultado do Rastreamento*

🏢 **Remetente:** ${data.remetente}
👤 **Destinatário:** ${data.destinatario}
🔢 **NF:** ${data.nf}
📦 **Pedido:** ${data.pedido || 'N/A'}
📍 **Cidade:** ${data.cidade}
📅 **Data/Hora:** ${new Date(data.data_hora).toLocaleString('pt-BR')}

📊 **Status Atual:** ${data.status}
📝 **Detalhes:** ${data.descricao?.replace(/,.*/, "")}
            `);

            // Add delivery confirmation if delivered
            if (isDelivered) {
                message += `\n✅ **ENTREGA REALIZADA!**`;
            }

            // Add option to see full tracking history
            if (data.tracking_completo && data.tracking_completo.length > 1) {
                message += `\n\n💡 *Digite "historico" para ver o rastreamento completo*`;
            }

        } else if (data.cpf || data.nome) {
            // Legacy CPF tracking result format
            message = formatMessage(`
👤 *Resultado do Rastreamento por CPF*

🆔 **CPF:** ${data.cpf}
👨‍💼 **Nome:** ${data.nome}
📍 **Cidade:** ${data.cidade}
📊 **Status:** ${data.status}
            `);

            // Add delivery proof if available
            if (data.status === 'ENTREGA REALIZADA' && data.comprovante) {
                message += `\n📄 **Comprovante:** ${data.comprovante}`;
            }
        } else {
            // Fallback message
            message = formatMessage(`
📋 *Resultado do Rastreamento*

📊 **Status:** ${data.status || 'Informações disponíveis'}
📝 **Detalhes:** ${JSON.stringify(data, null, 2)}
            `);
        }

        await this.sendMessage(sock, phoneNumber, message);
    }

    async offerMoreHelp(sock, phoneNumber, conversation) {
        // Clear any awaiting input state
        await this.conversationService.updateConversation(conversation.id, {
            awaiting_input: null
        });

        const message = formatMessage(`
✅ *Consulta realizada com sucesso!*

Posso ajudar com mais alguma coisa?

1️⃣ Rastreio DANFE
2️⃣ Rastreio por CPF  
3️⃣ Falar com atendente
4️⃣ Encerrar atendimento
        `);

        await this.sendMessage(sock, phoneNumber, message);
    }

    async handleGeneralQuestion(sock, phoneNumber, messageText, conversation) {
        const lowerMessage = messageText.toLowerCase().trim();

        // Check if user wants to see tracking history
        if (lowerMessage === 'historico' || lowerMessage === 'histórico') {
            await this.sendTrackingHistory(sock, phoneNumber, conversation);
            return;
        }

        // Simple AI-like responses for common questions
        const responses = {
            'horario': 'Nosso atendimento funciona 24h através deste chat automatizado. Para atendimento humano, digite "3" ou "atendente".',
            'prazo': 'Os prazos de entrega variam conforme o destino. Use nosso sistema de rastreamento para acompanhar sua encomenda.',
            'problema': 'Para resolver problemas específicos, digite "3" para falar com um atendente humano.',
            'ajuda': 'Posso ajudar você com rastreamento de encomendas. Digite "1" para rastrear por DANFE ou "2" para rastrear por CPF.',
            'obrigado': 'Fico feliz em ajudar! 😊 Precisa de mais alguma coisa?'
        };

        let response = null;

        // Find matching response
        for (const [key, value] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                response = value;
                break;
            }
        }

        if (!response) {
            response = formatMessage(`
🤖 *Assistente Virtual*

Entendi sua mensagem, para melhor atendimento use nosso menu:

1️⃣ Rastreio DANFE  
2️⃣ Rastreio por CPF
3️⃣ Falar com atendente
4️⃣ Encerrar atendimento

*Dica:* Digite apenas o número da opção desejada.
            `);
        }

        await this.sendMessage(sock, phoneNumber, response);

        // Log AI response
        await DatabaseService.logMessage({
            phone_number: phoneNumber,
            message: response,
            is_from_bot: true,
            timestamp: new Date()
        });
    }

    async handleEndConversation(sock, phoneNumber, conversation) {
        const message = formatMessage(`
🙏 *Obrigado por utilizar nosso atendimento* 🚚✨

Como você avalia nossa experiência hoje?
⭐ Digite um número de 1 a 5 estrelas:

1 = (Muito insatisfeito)
2 = (Insatisfeito)
3 = (Regular)
4 = (Satisfeito)
5 = (Muito satisfeito)
        `);

        await this.sendMessage(sock, phoneNumber, message);
        
        await this.conversationService.updateConversation(conversation.id, {
            awaiting_input: 'rating',
            status: 'ending'
        });

        // Set timeout to auto-close after 5 minutes
        setTimeout(async () => {
            const conv = await this.conversationService.getConversation(conversation.id);
            if (conv && conv.status === 'ending') {
                await this.conversationService.updateConversation(conversation.id, {
                    status: 'completed',
                    end_time: new Date()
                });
            }
        }, 1 * 60 * 1000); // 1 minute
    }

    async processRating(sock, phoneNumber, rating, conversation) {
        const ratingNum = parseInt(rating);
        
        if (ratingNum >= 1 && ratingNum <= 5) {
            // Save rating
            await this.conversationService.updateConversation(conversation.id, {
                rating: ratingNum,
                status: 'completed',
                end_time: new Date(),
                awaiting_input: null
            });

            const stars = '⭐'.repeat(ratingNum);
            const message = formatMessage(`
${stars} *Obrigado pela sua avaliação!*

Sua opinião é muito importante para melhorarmos nosso atendimento.

A Rodobras agradece por escolher nossos serviços!

Tenha um ótimo dia! 😊
            `);

            await this.sendMessage(sock, phoneNumber, message);
        } else {
            await this.sendMessage(sock, phoneNumber, 'Por favor, digite um número de 1 a 5 para avaliar nosso atendimento.');
        }
    }

    async sendMessage(sock, phoneNumber, message) {
        try {
            const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
            await sock.sendMessage(jid, { text: message });
            
            // Log bot message
            await DatabaseService.logMessage({
                phone_number: phoneNumber.replace('@s.whatsapp.net', ''),
                message: message,
                is_from_bot: true,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async sendTrackingHistory(sock, phoneNumber, conversation) {
        try {
            // Get the last tracking request for this conversation
            const trackingData = await DatabaseService.getLastTrackingForConversation(conversation.id);
            
            if (!trackingData || !trackingData.result) {
                await this.sendMessage(sock, phoneNumber, 
                    '❌ Nenhum histórico de rastreamento encontrado para esta conversa.');
                return;
            }

            const result = JSON.parse(trackingData.result);
            
            if (!result.success || !result.data || !result.data.tracking_completo) {
                await this.sendMessage(sock, phoneNumber, 
                    '❌ Histórico de rastreamento não disponível.');
                return;
            }

            const tracking = result.data.tracking_completo;
            let historyMessage = formatMessage(`
📋 *Histórico Completo de Rastreamento*

🏢 **Remetente:** ${result.data.remetente}
👤 **Destinatário:** ${result.data.destinatario}
🔢 **NF:** ${result.data.nf}

📍 **Movimentações:**
            `);

            // Add each tracking event (limit to last 10 for readability)
            const recentEvents = tracking.slice(-10);
            recentEvents.forEach((event, index) => {
                const date = new Date(event.data_hora_efetiva).toLocaleString('pt-BR');
                const icon = event.tipo === 'Entrega' ? '✅' : 
                           event.tipo === 'Informativo' ? 'ℹ️' : '📦';
                
                historyMessage += `\n\n${icon} **${date}**`;
                historyMessage += `\n📍 ${event.cidade}`;
                historyMessage += `\n📝 ${event.ocorrencia}`;
                if (event.descricao !== event.ocorrencia) {
                    historyMessage += `\n💬 ${event.descricao}`;
                }
            });

            if (tracking.length > 10) {
                historyMessage += `\n\n*... e mais ${tracking.length - 10} eventos anteriores*`;
            }

            await this.sendMessage(sock, phoneNumber, historyMessage);
            await this.offerMoreHelp(sock, phoneNumber, conversation);

        } catch (error) {
            console.error('Error sending tracking history:', error);
            await this.sendMessage(sock, phoneNumber, 
                '❌ Erro ao recuperar histórico. Tente novamente mais tarde.');
        }
    }

    async sendErrorMessage(sock, jid) {
        const message = '❌ Ocorreu um erro inesperado. Tente novamente mais tarde ou digite "3" para falar com um atendente.';
        await sock.sendMessage(jid, { text: message });
    }


/**
 * 🔘 Trata o clique do botão "Encerrar Atendimento"
 */
async handleAttendantButtonResponse(sock, buttonId) {
    try {
        if (!buttonId.startsWith('encerrar_')) return;

        const phoneNumber = buttonId.replace('encerrar_', '');
        const conversation = await this.conversationService.getActiveConversation(phoneNumber);

        if (!conversation || conversation.status !== 'waiting_attendant') {
            console.log(`⚠️ Nenhum atendimento ativo para ${phoneNumber}`);
            return;
        }

        // Atualiza status e define que aguardará avaliação
        await this.conversationService.updateConversation(conversation.id, {
            status: 'ending',
            awaiting_input: 'rating'
        });

        // Envia enquete de avaliação ao cliente
        const ratingMessage = formatMessage(`
🙏 *Obrigado por falar com nosso atendente!*  

Por favor, avalie seu atendimento:  
1️⃣ Péssimo  
2️⃣ Regular  
3️⃣ Ótimo
        `);

        await this.sendMessage(sock, phoneNumber, ratingMessage);

        // Envia confirmação ao atendente
        const confirmMessage = `✅ Atendimento com ${phoneNumber} encerrado e enquete enviada ao cliente.`;
        await sock.sendMessage(process.env.SUPPORT_NUMBER || '554198200712@s.whatsapp.net', { text: confirmMessage });

        console.log(confirmMessage);
    } catch (err) {
        console.error('Erro ao processar botão de encerramento:', err);
    }
}
}

module.exports = MessageController;