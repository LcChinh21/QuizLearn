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

        const systemPrompt = 'You are an expert at extracting vocabulary from exam images. Extract all English vocabulary words with phonetic, part of speech, and Vietnamese meaning. Return ONLY a JSON array.';

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
                            { type: 'text', text: 'Respond with ONLY valid JSON array, no markdown, no thinking.' },
                            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageBase64 } }
                        ]
                    }
                ],
                temperature: 0.1,
                reasoning_effort: 'off'
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Groq API Error:', response.status, errBody);
            throw new Error('Groq Vision API Error: ' + response.status);
        }

        const data = await response.json();
        let content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content : '[]';

        // Strip thinking blocks using regex
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
        
        // Find JSON array - extract from first [ to last ]
        var firstBracket = content.indexOf('[');
        var lastBracket = content.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            content = content.substring(firstBracket, lastBracket + 1);
        }

        // Remove markdown code blocks
        content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').replace(/`/g, '').trim();

        // Log for debugging
        console.log('OCR cleaned content length:', content.length);

        var words;
        try {
            // Try to parse JSON directly
            words = JSON.parse(content);
        } catch (parseError) {
            console.error('JSON parse error:', parseError.message);
            
            // Fallback: try to fix common JSON issues
            try {
                // Try removing any trailing comma before closing bracket
                var fixedContent = content.replace(/,(\s*[}\]])/g, '$1');
                words = JSON.parse(fixedContent);
                console.log('JSON fixed by removing trailing commas');
            } catch (e2) {
                console.error('JSON fix failed');
                words = [];
            }
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
