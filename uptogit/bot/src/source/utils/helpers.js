const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Generate unique protocol ID
function generateProtocolId() {
    const timestamp = moment().format('YYYYMMDD-HHmmss');
    const shortId = uuidv4().substring(0, 8).toUpperCase();
    return `${timestamp}-${shortId}`;
}

// Format message for WhatsApp (removes extra whitespace and formats nicely)
function formatMessage(message) {
    return message
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        .trim();
}

// Validate phone number format
function validatePhoneNumber(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return cleanNumber.length >= 10 && cleanNumber.length <= 15;
}

// Format phone number for WhatsApp
function formatPhoneForWhatsApp(phoneNumber) {
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming Brazil)
    if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
        cleanNumber = '55' + cleanNumber.substring(1);
    } else if (cleanNumber.length === 10) {
        cleanNumber = '5511' + cleanNumber;
    } else if (cleanNumber.length === 11 && !cleanNumber.startsWith('55')) {
        cleanNumber = '55' + cleanNumber;
    }
    
    return cleanNumber + '@s.whatsapp.net';
}

// Extract phone number from WhatsApp JID
function extractPhoneNumber(jid) {
    return jid.replace('@s.whatsapp.net', '');
}

// Validate DANFE key
function validateDanfeKey(key) {
    const cleanKey = key.replace(/\D/g, '');
    return cleanKey.length === 44;
}

// Validate CPF
function validateCpf(cpf) {
    const cleanCpf = cpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) return false;
    
    // Check for known invalid patterns
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
    
    // Calculate verification digits
    let sum = 0;
    let remainder;
    
    // First digit verification
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;
    
    // Second digit verification
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;
    
    return true;
}

// Format CPF for display
function formatCpfForDisplay(cpf) {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
        return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
}

// Format DANFE key for display
function formatDanfeForDisplay(danfe) {
    const cleanDanfe = danfe.replace(/\D/g, '');
    if (cleanDanfe.length === 44) {
        return cleanDanfe.replace(/(\d{4})/g, '$1 ').trim();
    }
    return danfe;
}

// Generate random delay (to simulate human-like response times)
function getRandomDelay(min = 500, max = 2000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Format date for display
function formatDate(date, format = 'DD/MM/YYYY HH:mm') {
    return moment(date).format(format);
}

// Get Brazilian timezone date
function getBrazilianDate() {
    return moment().utcOffset(-3); // UTC-3 (Brasília timezone)
}

// Check if time is within business hours (optional for future use)
function isBusinessHours(date = new Date()) {
    const hour = date.getHours();
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Monday to Friday, 8 AM to 6 PM
    return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour < 18;
}

// Escape markdown characters for WhatsApp
function escapeMarkdown(text) {
    return text.replace(/[_*~`]/g, '\\$&');
}

// Clean message text (remove emojis, extra spaces, etc.)
function cleanMessageText(text) {
    return text
        .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Extract keywords from message
function extractKeywords(message) {
    const keywords = [];
    const lowerMessage = message.toLowerCase();
    
    // Common tracking keywords
    const trackingKeywords = ['rastreio', 'rastrear', 'acompanhar', 'localizar', 'onde esta', 'cadê'];
    const danfeKeywords = ['danfe', 'nf', 'nota fiscal', 'chave'];
    const cpfKeywords = ['cpf', 'documento', 'destinatario'];
    const helpKeywords = ['ajuda', 'help', 'socorro', 'problema'];
    const attendantKeywords = ['atendente', 'humano', 'pessoa', 'falar'];
    
    trackingKeywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) keywords.push('tracking');
    });
    
    danfeKeywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) keywords.push('danfe');
    });
    
    cpfKeywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) keywords.push('cpf');
    });
    
    helpKeywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) keywords.push('help');
    });
    
    attendantKeywords.forEach(keyword => {
        if (lowerMessage.includes(keyword)) keywords.push('attendant');
    });
    
    return [...new Set(keywords)]; // Remove duplicates
}

// Generate conversation summary
function generateConversationSummary(messages, trackingRequests) {
    const summary = {
        totalMessages: messages.length,
        userMessages: messages.filter(m => !m.is_from_bot).length,
        botMessages: messages.filter(m => m.is_from_bot).length,
        trackingRequests: trackingRequests.length,
        trackingTypes: [...new Set(trackingRequests.map(t => t.tracking_type))],
        duration: null
    };
    
    if (messages.length > 0) {
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        const durationMs = new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp);
        summary.duration = Math.round(durationMs / 1000 / 60); // Duration in minutes
    }
    
    return summary;
}

// Log function with timestamp
function logWithTimestamp(message, level = 'info') {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const prefix = level.toUpperCase();
    console.log(`[${timestamp}] ${prefix}: ${message}`);
}

// Error handler wrapper
function handleError(error, context = 'Unknown') {
    const errorMessage = `Error in ${context}: ${error.message}`;
    logWithTimestamp(errorMessage, 'error');
    console.error(error);
    return errorMessage;
}

// Retry function with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            const delay = baseDelay * Math.pow(2, i);
            logWithTimestamp(`Retry ${i + 1}/${maxRetries} after ${delay}ms delay`, 'warning');
            await sleep(delay);
        }
    }
}

module.exports = {
    generateProtocolId,
    formatMessage,
    validatePhoneNumber,
    formatPhoneForWhatsApp,
    extractPhoneNumber,
    validateDanfeKey,
    validateCpf,
    formatCpfForDisplay,
    formatDanfeForDisplay,
    getRandomDelay,
    sleep,
    formatDate,
    getBrazilianDate,
    isBusinessHours,
    escapeMarkdown,
    cleanMessageText,
    extractKeywords,
    generateConversationSummary,
    logWithTimestamp,
    handleError,
    retryWithBackoff
};