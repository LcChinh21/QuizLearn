export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { imageBase64 } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Missing image data' });
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error('Missing GROQ_API_KEY');
            return res.status(500).json({ error: 'Missing GROQ_API_KEY' });
        }

        const systemPrompt = 'You are an expert at extracting vocabulary from exam images. Extract all English vocabulary words with phonetic, part of speech, and Vietnamese meaning. Return ONLY a JSON array: [{\"word\": \"word\", \"phonetic\": \"/fəˈnetɪk/\", \"type\": \"(n)\", \"meaning\": \"meaning\"}]';

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: 'qwen/qwen3.6-27b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Respond with ONLY JSON array, no markdown.' },
                            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageBase64 } }
                        ]
                    }
                ],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Groq API Error:', response.status, errBody);
            throw new Error('Groq Vision API Error: ' + response.status);
        }

        const data = await response.json();
        let content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : '[]';

        // Strip thinking blocks
        const ts = String.fromCharCode(60, 112, 32, 116, 104, 105, 110, 107, 62);
        const te = String.fromCharCode(60, 47, 112, 116, 104, 105, 110, 107, 62);
        var parts = content.split(ts);
        content = parts[0];
        for (var i = 1; i < parts.length; i++) {
            var afterThink = parts[i].split(te);
            content += afterThink.slice(1).join(te);
        }

        // Extract JSON from markdown or plain text
        var jsonMatch = content.match(/`json\s*([\s\S]*?)`/i);
        if (jsonMatch) {
            content = jsonMatch[1];
        } else {
            var firstBracket = content.indexOf('[');
            var lastBracket = content.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                content = content.substring(firstBracket, lastBracket + 1);
            }
        }

        content = content.replace(/\x60\x60\x60/g, '').trim();

        var words;
        try {
            words = JSON.parse(content);
        } catch (parseError) {
            console.error('JSON parse error:', parseError, 'Content:', content);
            words = [];
        }

        if (!Array.isArray(words)) {
            words = [];
        }

        res.status(200).json({ words });

    } catch (error) {
        console.error('OCR API Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
