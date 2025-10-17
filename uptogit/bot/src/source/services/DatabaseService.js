const { database } = require('../models/Database');

class DatabaseService {
    // Message operations
    static async logMessage(messageData) {
        try {
            const connection = await database.getConnection();
            const { phone_number, message, is_from_bot, conversation_id, timestamp } = messageData;
            
            const [result] = await connection.execute(
                'INSERT INTO messages (phone_number, message, is_from_bot, conversation_id, timestamp) VALUES (?, ?, ?, ?, ?)',
                [phone_number, message, is_from_bot, conversation_id || null, timestamp || new Date()]
            );
            
            return result.insertId;
        } catch (error) {
            console.error('Error logging message:', error);
            throw error;
        }
    }

    // Tracking operations
    static async logTracking(trackingData) {
        try {
            const connection = await database.getConnection();
            const { conversation_id, tracking_type, tracking_value, result, success = false } = trackingData;
            
            // Extract data for easier querying
            let city = null, sender = null, nf = null, status = null;
            
            if (result && typeof result === 'object') {
                const data = typeof result === 'string' ? JSON.parse(result) : result;
                if (data.data) {
                    city = data.data.cidade || null;
                    sender = data.data.remetente || null;
                    nf = data.data.nf || null;
                    status = data.data.status || null;
                }
            }
            
            const [insertResult] = await connection.execute(
                `INSERT INTO tracking_requests 
                (conversation_id, tracking_type, tracking_value, result, success, city, sender, nf, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [conversation_id, tracking_type, tracking_value, JSON.stringify(result), success, city, sender, nf, status]
            );
            
            return insertResult.insertId;
        } catch (error) {
            console.error('Error logging tracking:', error);
            throw error;
        }
    }

    // Daily interaction operations
    static async recordDailyInteraction(phoneNumber) {
        try {
            const connection = await database.getConnection();
            const today = new Date().toISOString().split('T')[0];
            
            await connection.execute(
                `INSERT INTO daily_interactions (phone_number, interaction_date, total_messages) 
                VALUES (?, ?, 1) 
                ON DUPLICATE KEY UPDATE 
                total_messages = total_messages + 1`,
                [phoneNumber, today]
            );
            
            return true;
        } catch (error) {
            console.error('Error recording daily interaction:', error);
            throw error;
        }
    }

    static async isFirstInteractionToday(phoneNumber) {
        try {
            const connection = await database.getConnection();
            const today = new Date().toISOString().split('T')[0];
            
            const [rows] = await connection.execute(
                'SELECT id FROM daily_interactions WHERE phone_number = ? AND interaction_date = ?',
                [phoneNumber, today]
            );
            
            return rows.length === 0;
        } catch (error) {
            console.error('Error checking daily interaction:', error);
            return true; // Default to true if error
        }
    }

    // Stats for dashboard
    static async getStats() {
        try {
            const connection = await database.getConnection();
            
            // Total conversations
            const [totalConversations] = await connection.execute(
                'SELECT COUNT(*) as total FROM conversations'
            );
            
            // Conversations today
            const [conversationsToday] = await connection.execute(
                'SELECT COUNT(*) as total FROM conversations WHERE DATE(created_at) = CURDATE()'
            );
            
            // Total tracking requests
            const [totalTracking] = await connection.execute(
                'SELECT COUNT(*) as total FROM tracking_requests'
            );
            
            // Tracking requests today
            const [trackingToday] = await connection.execute(
                'SELECT COUNT(*) as total FROM tracking_requests WHERE DATE(created_at) = CURDATE()'
            );
            
            // Average rating
            const [avgRating] = await connection.execute(
                'SELECT AVG(rating) as average FROM conversations WHERE rating IS NOT NULL'
            );
            
            // Rating distribution
            const [ratingDist] = await connection.execute(
                `SELECT rating, COUNT(*) as count 
                FROM conversations 
                WHERE rating IS NOT NULL 
                GROUP BY rating 
                ORDER BY rating`
            );
            
            // Most used service
            const [serviceStats] = await connection.execute(
                `SELECT service_type, COUNT(*) as count 
                FROM conversations 
                WHERE service_type IS NOT NULL 
                GROUP BY service_type 
                ORDER BY count DESC`
            );
            
            return {
                totalConversations: totalConversations[0].total,
                conversationsToday: conversationsToday[0].total,
                totalTracking: totalTracking[0].total,
                trackingToday: trackingToday[0].total,
                averageRating: parseFloat(avgRating[0].average || 0).toFixed(1),
                ratingDistribution: ratingDist,
                serviceStats: serviceStats
            };
            
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }

    // Get conversations for dashboard
    static async getConversations(page = 1, limit = 10, filter = {}) {
        try {
            const connection = await database.getConnection();
            const offset = (page - 1) * limit;
            
            let whereClause = '1 = 1';
            let params = [];
            
            if (filter.status) {
                whereClause += ' AND status = ?';
                params.push(filter.status);
            }
            
            if (filter.startDate) {
                whereClause += ' AND DATE(created_at) >= ?';
                params.push(filter.startDate);
            }
            
            if (filter.endDate) {
                whereClause += ' AND DATE(created_at) <= ?';
                params.push(filter.endDate);
            }
            
            const [conversations] = await connection.execute(
                `SELECT * FROM conversations 
                WHERE ${whereClause} 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );
            
            const [total] = await connection.execute(
                `SELECT COUNT(*) as count FROM conversations WHERE ${whereClause}`,
                params
            );
            
            return {
                conversations,
                total: total[0].count,
                page,
                limit,
                totalPages: Math.ceil(total[0].count / limit)
            };
            
        } catch (error) {
            console.error('Error getting conversations:', error);
            throw error;
        }
    }

    // Get tracking data for dashboard
    static async getTrackingData(filters = {}) {
        try {
            const connection = await database.getConnection();
            
            let whereClause = '1 = 1';
            let params = [];
            
            if (filters.startDate) {
                whereClause += ' AND DATE(created_at) >= ?';
                params.push(filters.startDate);
            }
            
            if (filters.endDate) {
                whereClause += ' AND DATE(created_at) <= ?';
                params.push(filters.endDate);
            }
            
            if (filters.city) {
                whereClause += ' AND city LIKE ?';
                params.push(`%${filters.city}%`);
            }
            
            if (filters.sender) {
                whereClause += ' AND sender LIKE ?';
                params.push(`%${filters.sender}%`);
            }
            
            // Get tracking data
            const [trackingData] = await connection.execute(
                `SELECT 
                    tracking_type,
                    tracking_value,
                    city,
                    sender,
                    nf,
                    status,
                    success,
                    created_at
                FROM tracking_requests 
                WHERE ${whereClause} 
                ORDER BY created_at DESC`,
                params
            );
            
            // Get city distribution
            const [cityStats] = await connection.execute(
                `SELECT city, COUNT(*) as count 
                FROM tracking_requests 
                WHERE ${whereClause} AND city IS NOT NULL 
                GROUP BY city 
                ORDER BY count DESC 
                LIMIT 10`,
                params
            );
            
            // Get sender distribution
            const [senderStats] = await connection.execute(
                `SELECT sender, COUNT(*) as count 
                FROM tracking_requests 
                WHERE ${whereClause} AND sender IS NOT NULL 
                GROUP BY sender 
                ORDER BY count DESC 
                LIMIT 10`,
                params
            );
            
            // Get status distribution
            const [statusStats] = await connection.execute(
                `SELECT status, COUNT(*) as count 
                FROM tracking_requests 
                WHERE ${whereClause} AND status IS NOT NULL 
                GROUP BY status 
                ORDER BY count DESC`,
                params
            );
            
            return {
                trackingData,
                cityStats,
                senderStats,
                statusStats
            };
            
        } catch (error) {
            console.error('Error getting tracking data:', error);
            throw error;
        }
    }

    // System logging
    static async logSystem(level, message, data = null) {
        try {
            const connection = await database.getConnection();
            
            await connection.execute(
                'INSERT INTO system_logs (level, message, data) VALUES (?, ?, ?)',
                [level, message, data ? JSON.stringify(data) : null]
            );
            
            return true;
        } catch (error) {
            console.error('Error logging system message:', error);
            return false;
        }
    }

    // Get last tracking for conversation
    static async getLastTrackingForConversation(conversationId) {
        try {
            const connection = await database.getConnection();
            
            const [results] = await connection.execute(
                'SELECT * FROM tracking_requests WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1',
                [conversationId]
            );
            
            return results.length > 0 ? results[0] : null;
            
        } catch (error) {
            console.error('Error getting last tracking for conversation:', error);
            return null;
        }
    }

    // Cleanup old data
    static async cleanupOldData(daysToKeep = 90) {
        try {
            const connection = await database.getConnection();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            // Delete old conversations and related data
            const [result] = await connection.execute(
                'DELETE FROM conversations WHERE created_at < ? AND status = "completed"',
                [cutoffDate]
            );
            
            console.log(`🧹 Cleaned up ${result.affectedRows} old conversations`);
            
            // Delete old system logs
            const [logResult] = await connection.execute(
                'DELETE FROM system_logs WHERE created_at < ?',
                [cutoffDate]
            );
            
            console.log(`🧹 Cleaned up ${logResult.affectedRows} old system logs`);
            
            return { conversations: result.affectedRows, logs: logResult.affectedRows };
        } catch (error) {
            console.error('Error cleaning up old data:', error);
            throw error;
        }
    }
}

module.exports = DatabaseService;