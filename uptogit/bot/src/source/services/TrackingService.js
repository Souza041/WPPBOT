const axios = require('axios');
const xml2js = require('xml2js');

class TrackingService {
    constructor() {
        this.apiBaseUrl = process.env.SSW_API_BASE_URL || 'https://ssw.inf.br/api';
        this.domain = process.env.SSW_DOMAIN || 'TES';
        this.username = process.env.SSW_USERNAME || 'sswlogin';
        this.password = process.env.SSW_PASSWORD || 'swordfish';
    }

    async trackByDanfe(danfeKey) {
        try {
            console.log(`🔍 Tracking DANFE: ${danfeKey}`);

            const response = await axios.post(`${this.apiBaseUrl}/trackingdanfe`, {
                chave_nfe: danfeKey
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return this.parseTrackingResponse(response.data);

        } catch (error) {
            console.error('Error tracking DANFE:', error.message);
            
            if (error.response) {
                return this.parseTrackingResponse(error.response.data);
            }
            
            return {
                success: false,
                message: 'Erro de conexão com o serviço de rastreamento'
            };
        }
    }

    async trackByCpf(cpf) {
        try {
            console.log(`🔍 Tracking CPF: ${cpf}`);

            const response = await axios.post(`${this.apiBaseUrl}/trackingpf`, {
                dominio: this.domain,
                usuario: this.username,
                senha: this.password,
                cpf: cpf
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            console.log('📊 CPF API Response:', JSON.stringify(response.data, null, 2));
            return this.parseTrackingResponse(response.data);

        } catch (error) {
            console.error('Error tracking CPF:', error.message);
            
            if (error.response) {
                console.log('📊 CPF Error Response:', JSON.stringify(error.response.data, null, 2));
                return this.parseTrackingResponse(error.response.data);
            }
            
            return {
                success: false,
                message: 'Erro de conexão com o serviço de rastreamento'
            };
        }
    }

    async parseTrackingResponse(data) {
        try {
            console.log('🔄 Parsing tracking response:', typeof data, data);

            // Check if response is JSON object
            if (typeof data === 'object' && data !== null) {
                // Check for SSW API response format
                if (data.success === true && data.documentos && Array.isArray(data.documentos)) {
                    // Extract data from SSW format
                    const documento = data.documentos[0];
                    if (documento && documento.header && documento.tracking) {
                        const header = documento.header;
                        const tracking = documento.tracking;
                        
                        // Get latest tracking event
                        const latestEvent = tracking[tracking.length - 1];
                        
                        // Format data for compatibility
                        const formattedData = {
                            remetente: header.remetente,
                            destinatario: header.destinatario,
                            nf: header.nro_nf,
                            pedido: header.pedido,
                            status: latestEvent.ocorrencia,
                            descricao: latestEvent.descricao,
                            cidade: latestEvent.cidade,
                            data_hora: latestEvent.data_hora_efetiva,
                            tipo: latestEvent.tipo,
                            tracking_completo: tracking
                        };

                        return {
                            success: true,
                            data: formattedData
                        };
                    }
                }
                
                // Check for SSW error response
                if (data.success === false && data.message) {
                    return {
                        success: false,
                        message: data.message
                    };
                }
                
                // Check for standard tracking fields (fallback)
                if (data.nf || data.cpf || data.remetente || data.nome) {
                    return {
                        success: true,
                        data: data
                    };
                }
                
                // Check for error messages in object
                if (data.message) {
                    return {
                        success: false,
                        message: data.message
                    };
                }

                // If object doesn't have expected fields, treat as error
                return {
                    success: false,
                    message: 'Nenhum documento localizado'
                };
            }

            // Check if response is XML string
            if (typeof data === 'string' && data.includes('<tracking>')) {
                const parser = new xml2js.Parser();
                const result = await parser.parseStringPromise(data);
                
                if (result.tracking) {
                    const success = result.tracking.success && result.tracking.success[0] === 'true';
                    const message = result.tracking.message ? result.tracking.message[0] : '';
                    
                    if (!success) {
                        return {
                            success: false,
                            message: message || 'Erro desconhecido'
                        };
                    }
                    
                    return {
                        success: true,
                        data: this.extractTrackingDataFromXml(result.tracking)
                    };
                }
            }

            // If data is JSON string, parse it
            if (typeof data === 'string') {
                try {
                    const jsonData = JSON.parse(data);
                    return this.parseTrackingResponse(jsonData);
                } catch (jsonError) {
                    // If not JSON, treat as raw message
                    console.log('⚠️ Received non-JSON string response:', data);
                    
                    // Check for specific API messages
                    if (data.toLowerCase().includes('acesso inválido') || data.toLowerCase().includes('acesso invalido')) {
                        return {
                            success: false,
                            message: 'Acesso invalido'
                        };
                    }
                    
                    if (data.toLowerCase().includes('documento') && data.toLowerCase().includes('localizado')) {
                        return {
                            success: false,
                            message: data
                        };
                    }
                    
                    return {
                        success: false,
                        message: data || 'Resposta inesperada do servidor'
                    };
                }
            }

            return {
                success: false,
                message: 'Formato de resposta inválido'
            };

        } catch (error) {
            console.error('Error parsing tracking response:', error);
            return {
                success: false,
                message: 'Erro ao processar resposta do servidor'
            };
        }
    }

    extractTrackingDataFromXml(xmlData) {
        // Extract data from XML structure
        const data = {};
        
        if (xmlData.nf) data.nf = xmlData.nf[0];
        if (xmlData.cpf) data.cpf = xmlData.cpf[0];
        if (xmlData.remetente) data.remetente = xmlData.remetente[0];
        if (xmlData.nome) data.nome = xmlData.nome[0];
        if (xmlData.cidade) data.cidade = xmlData.cidade[0];
        if (xmlData.status) data.status = xmlData.status[0];
        if (xmlData.previsao_entrega) data.previsao_entrega = xmlData.previsao_entrega[0];
        if (xmlData.comprovante) data.comprovante = xmlData.comprovante[0];
        
        return data;
    }

    // Method to test API connectivity
    async testConnection() {
        try {
            // Test with a dummy DANFE key
            const testResult = await this.trackByDanfe('00000000000000000000000000000000000000000000');
            console.log('🔧 API Test Result:', testResult);
            return testResult;
        } catch (error) {
            console.error('❌ API Test Failed:', error.message);
            return { success: false, message: 'API connection test failed' };
        }
    }

    // Utility method to validate DANFE format
    static validateDanfeKey(key) {
        const cleanKey = key.replace(/\D/g, '');
        return cleanKey.length === 44;
    }

    // Utility method to validate CPF format
    static validateCpf(cpf) {
        const cleanCpf = cpf.replace(/\D/g, '');
        return cleanCpf.length === 11;
    }

    // Format tracking data for display
    static formatTrackingData(data, type) {
        if (type === 'danfe') {
            return {
                title: '📦 Rastreamento DANFE',
                items: [
                    { label: 'NF', value: data.nf },
                    { label: 'Remetente', value: data.remetente },
                    { label: 'Cidade', value: data.cidade },
                    { label: 'Status', value: data.status },
                    { label: 'Previsão', value: data.previsao_entrega }
                ]
            };
        } else if (type === 'cpf') {
            const items = [
                { label: 'CPF', value: data.cpf },
                { label: 'Nome', value: data.nome },
                { label: 'Cidade', value: data.cidade },
                { label: 'Status', value: data.status }
            ];

            if (data.status === 'ENTREGA REALIZADA' && data.comprovante) {
                items.push({ label: 'Comprovante', value: data.comprovante });
            }

            return {
                title: '👤 Rastreamento por CPF',
                items: items
            };
        }

        return { title: 'Rastreamento', items: [] };
    }
}

module.exports = new TrackingService();