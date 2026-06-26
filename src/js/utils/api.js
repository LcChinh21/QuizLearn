// ============================================
// QuizLearn - API Client
// ============================================

class ApiClient {
    static baseUrl = '/api';
    static timeout = 30000;

    static async request(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.details || 'Request failed');
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Yêu cầu bị hết thời gian. Vui lòng thử lại.');
            }
            
            throw error;
        }
    }

    static get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    static post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    static async getEnv() {
        return this.get('/env');
    }

    static async generateWords(topic, count) {
        return this.post('/generate', { topic, count });
    }

    static async translateWord(word) {
        return this.post('/translate', { word });
    }

    static async getAzureToken() {
        return this.get('/azure-token');
    }
}

window.ApiClient = ApiClient;
export default ApiClient;
