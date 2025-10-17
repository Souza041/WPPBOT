const mysql = require('mysql2/promise');

class Database {
    constructor() {
        this.connection = null;
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '040898',
            database: process.env.DB_NAME || 'whatsapp_bot',
            charset: 'utf8mb4',
            timezone: '+00:00',
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            authPlugins: {
                mysql_native_password: () => require('mysql2/lib/auth_plugins').mysql_native_password,
                mysql_clear_password: () => require('mysql2/lib/auth_plugins').mysql_clear_password
            }
        };
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(this.config);
            console.log('✅ Connected to MariaDB database');
            return this.connection;
        } catch (error) {
            console.error('❌ Database connection error:', error.message);
            throw error;
        }
    }

    async createDatabase() {
        try {
            // Connect without specifying database first
            const tempConnection = await mysql.createConnection({
                ...this.config,
                database: undefined
            });

            await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log(`✅ Database '${this.config.database}' created or exists`);
            
            await tempConnection.end();
        } catch (error) {
            console.error('❌ Error creating database:', error.message);
            throw error;
        }
    }

    async createTables() {
        if (!this.connection) {
            await this.connect();
        }

        const tables = [
            // Conversations table
            `CREATE TABLE IF NOT EXISTS conversations (
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
                end_time TIMESTAMP NULL,
                INDEX idx_phone_number (phone_number),
                INDEX idx_protocol_id (protocol_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Messages table
            `CREATE TABLE IF NOT EXISTS messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                phone_number VARCHAR(20) NOT NULL,
                conversation_id INT,
                message TEXT NOT NULL,
                is_from_bot BOOLEAN DEFAULT FALSE,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_phone_number (phone_number),
                INDEX idx_conversation_id (conversation_id),
                INDEX idx_timestamp (timestamp),
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Tracking requests table
            `CREATE TABLE IF NOT EXISTS tracking_requests (
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
                INDEX idx_conversation_id (conversation_id),
                INDEX idx_tracking_type (tracking_type),
                INDEX idx_tracking_value (tracking_value),
                INDEX idx_created_at (created_at),
                INDEX idx_city (city),
                INDEX idx_sender (sender),
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // Daily interactions table (for welcome message control)
            `CREATE TABLE IF NOT EXISTS daily_interactions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                phone_number VARCHAR(20) NOT NULL,
                interaction_date DATE NOT NULL,
                first_interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_messages INT DEFAULT 1,
                UNIQUE KEY unique_phone_date (phone_number, interaction_date),
                INDEX idx_phone_number (phone_number),
                INDEX idx_interaction_date (interaction_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

            // System logs table
            `CREATE TABLE IF NOT EXISTS system_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                level ENUM('info', 'warning', 'error') DEFAULT 'info',
                message TEXT NOT NULL,
                data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_level (level),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ];

        for (const tableSQL of tables) {
            try {
                await this.connection.execute(tableSQL);
                console.log('✅ Table created successfully');
            } catch (error) {
                console.error('❌ Error creating table:', error.message);
                throw error;
            }
        }

        console.log('✅ All database tables created successfully');
    }

    async getConnection() {
        if (!this.connection) {
            await this.connect();
        }
        return this.connection;
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
            console.log('✅ Database connection closed');
        }
    }

    // Health check method
    async healthCheck() {
        try {
            const connection = await this.getConnection();
            const [rows] = await connection.execute('SELECT 1 as health');
            return { status: 'healthy', timestamp: new Date() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date() };
        }
    }
}

const database = new Database();

// Initialize database function
async function initializeDatabase() {
    try {
        console.log('🔧 Initializing database...');
        
        await database.createDatabase();
        await database.connect();
        await database.createTables();
        
        console.log('✅ Database initialization completed');
        return database;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        throw error;
    }
}

module.exports = { Database, database, initializeDatabase };