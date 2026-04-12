export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { topic, count } = req.body;
        if (!topic) {
            return res.status(400).json({ error: 'Missing topic' });
        }

        const vocabCount = count || 10;
        const systemPrompt = `Bạn là một chuyên gia ngôn ngữ học tiếng Anh. Nhiệm vụ của bạn là tạo ra một danh sách gồm đúng ${vocabCount} từ vựng tiếng Anh theo chủ đề "${topic}".
Quy tắc định dạng TRẢ LỜI NGHIÊM NGẶT:
- CHỈ trả về nguyên một mảng JSON thuần túy (KHÔNG bọc trong block code \`\`\`json ... \`\`\`), bao gồm các object có cấu trúc:
[
  {"word": "từ tiếng Anh", "meaning 1, meaning 2, meaning 3": "nghĩa tiếng Việt ngắn gọn"} 
]
- Từ vựng phải từ mức độ B1 đến C1. Nghĩa tiếng Việt giải thích sát với ngữ cảnh chủ đề.
- Chắc chắn rằng mảng JSON là hợp lệ để dùng JSON.parse. Không trả về thêm bất kì bình luận, ký tự nào khác.`;

        const userPrompt = `Tạo danh sách ${vocabCount} từ vựng về chủ đề: "${topic}" Dưới dạng mảng JSON.`;

        const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY; 
        if (!apiKey) {
             return res.status(500).json({ error: 'Missing GROQ_API_KEY in environment.' });
        }

        // Khuyến nghị dùng model tốt cho tác vụ sinh format
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
        let textContent = data.choices?.[0]?.message?.content || "[]";
        
        // Xóa block code markdown nếu AI lỡ sinh ra
        textContent = textContent.replace(/```json/g, '').replace(/```/g, '').trim();

        const wordsArray = JSON.parse(textContent);
        
        res.status(200).json({ words: wordsArray });

    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
