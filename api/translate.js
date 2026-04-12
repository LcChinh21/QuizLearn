export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { word } = req.body;
        if (!word) {
            return res.status(400).json({ error: 'Missing word' });
        }

        const systemPrompt = `Bạn là một công cụ hỗ trợ học từ vựng English-Vietnamese. 
NHIỆM VỤ: Phản hồi chính xác theo khuôn mẫu văn bản dưới đây.

CÁC QUY TẮC BẮT BUỘC:
1. Từ gốc: Dòng đầu tiên ${word} luôn là từ ở dạng nguyên thể (infinitive).
2. Định dạng ví dụ: "- [Câu tiếng Anh]: [Câu tiếng Việt]."
3. Ngôn ngữ: KHÔNG được viết tiếng Việt vào vị trí của câu tiếng Anh.
4. Ký tự: KHÔNG dùng bất kỳ loại dấu nháy đơn (') hay kép (") nào.
5. Kết thúc: MỌI câu văn và dòng trạng thái đều PHẢI kết thúc bằng dấu chấm (.).
6. Trạng thái từ: Chỉ liệt kê các dạng chia của chính từ đó (V-ing, V-ed, s/es).

KHUÔN MẪU PHẢN HỒI:
${word}: Nghĩa 1, Nghĩa 2.
- [English sentence]: [Câu tiếng Việt].
- [English sentence]: [Câu tiếng Việt].
Sắc thái: (Ngắn gọn).
Các trạng thái của từ: (Các dạng chia từ).`;

        const userPrompt = `Từ cần dịch: "${word}"`;

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
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
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
