export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { word } = req.body;
        if (!word) {
            return res.status(400).json({ error: 'Missing word' });
        }

        const systemPrompt = `Bạn là biên dịch viên tiếng Anh sang tiếng Việt. Mục tiêu:
- Dịch chính xác, 2-3 ví dụ ngắn, sắc thái ngắn gọn.
Quy tắc định dạng TRẢ LỜI NGHIÊM NGẶT (Không dùng dấu nháy đơn/kép bao quanh nghĩa, mọi câu đều kết thúc bằng dấu chấm):
Cách hiển thị:
${word}: Nghĩa 1, Nghĩa 2.
- Câu ví dụ tiếng Anh 1: Nghĩa tiếng Việt.
- Câu ví dụ tiếng Anh 2: Nghĩa tiếng Việt.
VD: - He is running fast: Anh ấy đang chạy nhanh.
Sắc thái: (Ghi ngắn gọn sắc thái tại đây).
Lưu ý: 
Câu ví dụ tiếng anh phải là 1 câu tiếng anh
word ở đây là từ gốc nếu đang không ở từ gốc ví dụ từ "running" thì word sẽ là "run". Nếu đang ở từ gốc thì word vẫn là "run".`;

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
