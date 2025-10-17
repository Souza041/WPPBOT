require('dotenv').config();
const { makeWASocket, DisconnectReason, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const cors = require('cors');

const MessageController = require('./controllers/MessageController');
const DatabaseService = require('./services/DatabaseService');
const { initializeDatabase } = require('./models/Database');
const ConversationService = require('./services/ConversationService');

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.messageController = new MessageController();
        this.app = express();
        this.setupExpress();
        this.init();
    }

    setupExpress() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // API Routes for dashboard
        this.app.get('/api/stats', async (req, res) => {
            try {                                                                                       
                const stats = await DatabaseService.getStats();
                res.json(stats);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/conversations', async (req, res) => {
            try {
                const { page = 1, limit = 10, filter } = req.query;
                const conversations = await DatabaseService.getConversations(page, limit, filter);
                res.json(conversations);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/tracking-data', async (req, res) => {
            try {
                const { startDate, endDate, city, sender } = req.query;
                const trackingData = await DatabaseService.getTrackingData({
                    startDate, endDate, city, sender
                });
                res.json(trackingData);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        const port = process.env.BOT_PORT || 3002;
        this.app.listen(port, () => {
            console.log(`🚀 API Server running on port ${port}`);
        });
    }

    async init() {
        try {
            // Initialize database
            await initializeDatabase();
            console.log('✅ Database initialized');

            await this.connectToWhatsApp();
        } catch (error) {
            console.error('❌ Error initializing bot:', error);
        }
    }

    async connectToWhatsApp() {
        const authPath = path.join(__dirname, '../auth');
        const { state, saveCreds } = await useMultiFileAuthState(authPath);

        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: require('pino')({ level: 'silent' })
        });

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 Scan the QR code above to connect WhatsApp');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
                
                if (shouldReconnect) {
                    await delay(5000);
                    this.connectToWhatsApp();
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp connection opened');
            }
        });

        this.sock.ev.on('creds.update', saveCreds);
        
        this.sock.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message.key.fromMe && m.type === 'notify') {
                await this.messageController.handleMessage(this.sock, message);
            }
        });
    }
}

// Start the bot
new WhatsAppBot();

console.log('🤖 WhatsApp Chatbot started');
console.log('📊 Dashboard API available at http://localhost:' + (process.env.BOT_PORT || 3002));