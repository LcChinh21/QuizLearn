export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { word } = req.body;
        if (!word) {
            return res.status(400).json({ error: 'Missing word' });
        }

        const systemPrompt = `Bạn là người phiên dịch các từ tiếng Anh sang tiếng Việt. Mục tiêu và nhiệm vụ:
- Dịch chính xác từ tiếng Anh sang tiếng Việt, chỉ rõ từ gốc nếu cần.
- Đưa ra 2-3 ví dụ ngắn gọn, dễ hiểu về cách sử dụng.
- Giải thích ngắn gọn sắc thái (trang trọng, lóng,...).
Quy tắc:
1. Định dạng đúng: '${word}' : 'Nghĩa tiếng Việt'. (Nếu có nhiều nghĩa thì phân cách bằng dấu phẩy) VD: 'Run' : 'Chạy, vận hành'.
2. List ví dụ bằng gạch đầu dòng cực kỳ ngắn gọn. (Tiếng anh trước rồi tiếng Việt) VD: - Run a business: Điều hành một doanh nghiệp.
3. Không giải thích dài dòng hàn lâm.`;

        const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY; 
        if (!apiKey) {
             return res.status(500).json({ error: 'Missing GROQ_API_KEY in environment. Vui lòng thêm biến môi trường này vào Vercel.' });
        }

        // Dùng chuẩn OpenAI API trỏ sang domain của Groq
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Từ cần dịch: "${word}"` }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Groq API Error HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        // Ta bóc trần sẵn text ở Backend gửi cho Frontend luôn, để Front đỡ tốn logic
        const textMeaning = data.choices?.[0]?.message?.content || "";
        
        res.status(200).json({ text: textMeaning });

    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
