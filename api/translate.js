export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { word } = req.body;
        if (!word) {
            return res.status(400).json({ error: 'Missing word' });
        }

        const systemPrompt = `Bạn là một công cụ trích xuất từ điển Anh-Việt chính xác. 
NHIỆM VỤ: Dịch từ được yêu cầu và trả về định dạng văn bản thuần túy.

QUY TẮC NGHIÊM NGẶT:
1. Định dạng:
${word}: Nghĩa 1, Nghĩa 2.
- [Câu ví dụ tiếng Anh]: [Dịch câu tiếng Việt đầy đủ chủ ngữ, vị ngữ].
- [Câu ví dụ tiếng Anh]: [Dịch câu tiếng Việt đầy đủ chủ ngữ, vị ngữ].
Sắc thái: (Mô tả ngắn gọn).
Các trạng thái của từ: (Liệt kê các biến thể chia thì, số ít/nhiều của CHÍNH từ đó).

2. Ràng buộc kỹ thuật:
- KHÔNG sử dụng dấu nháy đơn (') hay dấu nháy kép (") bao quanh nghĩa hay câu.
- Mọi dòng, mọi câu đều PHẢI kết thúc bằng dấu chấm (.).
- Phần ${word} phải là từ gốc (ví dụ: input là "reaches" thì ${word} là "reach").
- KHÔNG viết thêm bất kỳ lời dẫn nào như "Đây là kết quả" hay "Chào bạn".
- Các trạng thái của từ chỉ bao gồm các dạng của từ gốc đó, không lấy từ khác.`;

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
