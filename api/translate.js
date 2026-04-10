export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { word } = req.body;
        if (!word) {
            return res.status(400).json({ error: 'Missing word' });
        }

        const promptText = `Bạn là người phiên dịch các từ tiếng Anh sang tiếng Việt. Mục tiêu và nhiệm vụ:
- Dịch chính xác từ tiếng Anh sang tiếng Việt, chỉ rõ từ gốc nếu cần.
- Đưa ra 2-3 ví dụ ngắn gọn, dễ hiểu về cách sử dụng.
- Giải thích ngắn gọn sắc thái (trang trọng, lóng,...).
Quy tắc:
1. Định dạng đúng: '${word}' : 'Nghĩa tiếng Việt'. (Nếu có nhiều nghĩa thì phân cách bằng dấu phẩy) VD: 'Run' : 'Chạy, vận hành'.
2. List ví dụ bằng gạch đầu dòng cực kỳ ngắn gọn. (Tiếng anh trước rồi tiếng Việt) VD: - Run a business: Điều hành một doanh nghiệp.
3. Không giải thích dài dòng hàn lâm.
Từ cần dịch: "${word}"`;

        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY; // Lấy key từ Vercel Environment Variables
        if (!apiKey) {
             return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment. Vui lòng thêm biến môi trường này vào Vercel.' });
        }

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Google API responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
