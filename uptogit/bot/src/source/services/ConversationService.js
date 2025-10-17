const { database } = require('../models/Database');
const DatabaseService = require('./DatabaseService');

class ConversationService {
    // Create new conversation
    async createConversation(conversationData) {
        try {
            const connection = await database.getConnection();
            const { phone_number, protocol_id, status = 'active', service_type = null } = conversationData;
            
            const [result] = await connection.execute(
                'INSERT INTO conversations (phone_number, protocol_id, status, service_type) VALUES (?, ?, ?, ?)',
                [phone_number, protocol_id, status, service_type]
            );
            
            // Record daily interaction
            await DatabaseService.recordDailyInteraction(phone_number);
            
            // Return the created conversation
            const [conversation] = await connection.execute(
                'SELECT * FROM conversations WHERE id = ?',
                [result.insertId]
            );
            
            console.log(`✅ Created new conversation ${protocol_id} for ${phone_number}`);
            return conversation[0];
            
        } catch (error) {
            console.error('Error creating conversation:', error);
            throw error;
        }
    }

// 🔹 Busca conversa ativa aceitando variações do número
async getActiveConversation(phoneNumber) {
    try {
        const connection = await database.getConnection();

        // normaliza número (só dígitos)
        const cleanNumber = phoneNumber.replace(/\D/g, '');

        const [conversations] = await connection.execute(
            `
            SELECT * FROM conversations 
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone_number, '+', ''), '-', ''), ' ', ''), '@s.whatsapp.net', '') LIKE ?
              AND status IN ('active', 'waiting_attendant', 'ending')
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [`%${cleanNumber}%`]
        );

        if (conversations.length > 0) {
            console.log('✅ Conversa encontrada para', cleanNumber);
            return conversations[0];
        }

        console.log('⚠️ Nenhuma conversa ativa encontrada para', cleanNumber);
        return null;

    } catch (error) {
        console.error('❌ Erro em getActiveConversation:', error);
        return null;
    }
}


    // Get conversation by ID
    async getConversation(conversationId) {
        try {
            const connection = await database.getConnection();
            
            const [conversations] = await connection.execute(
                'SELECT * FROM conversations WHERE id = ?',
                [conversationId]
            );
            
            return conversations.length > 0 ? conversations[0] : null;
            
        } catch (error) {
            console.error('Error getting conversation:', error);
            return null;
        }
    }

    // Update conversation
    async updateConversation(conversationId, updateData) {
        try {
            const connection = await database.getConnection();
            
            const fields = [];
            const values = [];
            
            // Build dynamic update query
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(updateData[key]);
                }
            });
            
            if (fields.length === 0) {
                return false;
            }
            
            // Always update the updated_at timestamp
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(conversationId);
            
            const [result] = await connection.execute(
                `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`,
                values
            );
            
            return result.affectedRows > 0;
            
        } catch (error) {
            console.error('Error updating conversation:', error);
            throw error;
        }
    }

    // Update conversation activity (last interaction)
    async updateActivity(conversationId) {
        try {
            return await this.updateConversation(conversationId, {
                updated_at: new Date()
            });
        } catch (error) {
            console.error('Error updating conversation activity:', error);
            return false;
        }
    }

    // Check if it's first interaction today
    async isFirstInteractionToday(phoneNumber) {
        return await DatabaseService.isFirstInteractionToday(phoneNumber);
    }
                                                                                    
    // Encerrar conversa e enviar mensagem de avaliação
    async endConversationWithFeedaback(sock, conversationId, phoneNumber){
        try {
            // Finaliza a conversa
            const success = await this.endConversation(conversationId);

            if (success) {
                // Mensagem de avaliação
                const feedbackMessage = 
                "🙏 Obrigado pelo atendimento!\n\n" +
                "Poderia nos avaliar? Responda com um número de 1 a 5:\n" +
                "⭐ 1 - Muito insatisfeito\n" +
                "⭐ 2 - Insatisfeito\n" +
                "⭐ 3 - Neutro\n" +
                "⭐ 4 - Satisfeito\n" +
                "⭐ 5 - Muito satisfeito";
                
                // Envia a mensagem de avaliação
                await sock.sendMessage(phoneNumber, { text: feedbackMessage });

                console.log(`✅ Sent feedback request to ${phoneNumber}`);
            }
            return success;
        } catch (error) {
            console.error('Error ending conversation with feedback:', error);
            throw error;
        }

    }

    // Get conversation history with messages
    async getConversationHistory(conversationId) {
        try {
            const connection = await database.getConnection();
            
            // Get conversation details
            const conversation = await this.getConversation(conversationId);
            if (!conversation) {
                return null;
            }
            
            // Get messages
            const [messages] = await connection.execute(
                'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
                [conversationId]
            );
            
            // Get tracking requests
            const [trackingRequests] = await connection.execute(
                'SELECT * FROM tracking_requests WHERE conversation_id = ? ORDER BY created_at ASC',
                [conversationId]
            );
            
            return {
                ...conversation,
                messages,
                trackingRequests
            };
            
        } catch (error) {
            console.error('Error getting conversation history:', error);
            throw error;
        }
    }

    // Get conversation stats
    async getConversationStats(phoneNumber = null) {
        try {
            const connection = await database.getConnection();
            
            let whereClause = '1 = 1';
            const params = [];
            
            if (phoneNumber) {
                whereClause += ' AND phone_number = ?';
                params.push(phoneNumber);
            }
            
            // Total conversations
            const [totalResult] = await connection.execute(
                `SELECT COUNT(*) as total FROM conversations WHERE ${whereClause}`,
                params
            );
            
            // Completed conversations
            const [completedResult] = await connection.execute(
                `SELECT COUNT(*) as total FROM conversations WHERE ${whereClause} AND status = 'completed'`,
                params
            );
            
            // Average rating
            const [ratingResult] = await connection.execute(
                `SELECT AVG(rating) as average FROM conversations WHERE ${whereClause} AND rating IS NOT NULL`,
                params
            );
            
            // Average duration (for completed conversations)
            const [durationResult] = await connection.execute(
                `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, end_time)) as average_minutes 
                FROM conversations 
                WHERE ${whereClause} AND status = 'completed' AND end_time IS NOT NULL`,
                params
            );
            
            return {
                total: totalResult[0].total,
                completed: completedResult[0].total,
                averageRating: parseFloat(ratingResult[0].average || 0).toFixed(1),
                averageDurationMinutes: parseFloat(durationResult[0].average_minutes || 0).toFixed(1)
            };
            
        } catch (error) {
            console.error('Error getting conversation stats:', error);
            throw error;
        }
    }

    // Auto-cleanup inactive conversations
    async cleanupInactiveConversations(hoursInactive = 2) {
        try {
            const connection = await database.getConnection();
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hoursInactive);
            
            const [result] = await connection.execute(
                'UPDATE conversations SET status = "completed", end_time = CURRENT_TIMESTAMP WHERE status IN ("active", "waiting_attendant") AND updated_at < ?',
                [cutoffTime]
            );
            
            if (result.affectedRows > 0) {
                console.log(`🧹 Auto-closed ${result.affectedRows} inactive conversations`);
            }
            
            return result.affectedRows;
            
        } catch (error) {
            console.error('Error cleaning up inactive conversations:', error);
            return 0;
        }
    }

    // Schedule periodic cleanup
    scheduleCleanup() {
        // Run cleanup every hour
        setInterval(async () => {
            try {
                await this.cleanupInactiveConversations(10 / 60); // 10 minutes inactive
            } catch (error) {
                console.error('Error in scheduled cleanup:', error);
            }
        }, 10 * 60 * 1000); // Every 10 minutes

        console.log('✅ Scheduled conversation cleanup every 10 minutes');
    }
}

module.exports = ConversationService;