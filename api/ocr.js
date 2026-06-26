export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { imageBase64, language } = req.body;
        
        if (!imageBase64) {
            return res.status(400).json({ error: 'Missing image data' });
        }

        const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Missing GROQ_API_KEY' });
        }

        const lang = language || 'en';
        const systemPrompt = `Bạn là một chuyên gia OCR. Nhiệm vụ: trích xuất tất cả các từ tiếng Anh từ hình ảnh được cung cấp.
QUY TẮC:
- Chỉ trả về MẢNG JSON thuần túy, không có markdown code block
- Mỗi từ phải có cấu trúc: {"word": "từ", "meaning": "nghĩa tiếng Việt ngắn gọn"}
- Nếu ảnh có câu/văn bản dài, chia thành các từ riêng lẻ
- Bỏ qua các từ tiếng Việt, số, ký hiệu đặc biệt
- Trả về tối đa 20 từ phổ biến nhất trong ảnh
- Đảm bảo JSON hợp lệ để parse`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.2-11b-vision-preview',
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt 
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Trích xuất tất cả từ tiếng Anh từ hình ảnh này và dịch sang tiếng Việt. Trả về JSON array.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Groq Vision API Error: ${response.status} ${errBody}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '[]';
        
        // Clean markdown if present
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let words;
        try {
            words = JSON.parse(content);
        } catch {
            // If JSON parse fails, try to extract words manually
            words = [];
        }

        res.status(200).json({ words });

    } catch (error) {
        console.error('OCR API Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
