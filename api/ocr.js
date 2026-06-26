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

        const systemPrompt = `You are an expert at extracting vocabulary from exam/test images.

TASK:
- Extract ALL English vocabulary words from this image
- Extract word, phonetic (IPA pronunciation), part of speech, and Vietnamese meaning

OUTPUT FORMAT:
Return ONLY a plain JSON array with this exact format:
[{"word": "english_word", "phonetic": "/ɪpsəˈluːt/", "type": "(n)", "meaning": "Vietnamese meaning"}]

RULES:
- Extract ALL vocabulary words shown in the image (no limit)
- Include phonetic transcription if visible in the image
- Include part of speech: (n) = noun, (v) = verb, (adj) = adjective, (adv) = adverb
- Extract Vietnamese meaning accurately
- Return ONLY JSON array, no markdown, no explanation
- Ensure valid JSON`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
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
                                text: 'Extract ALL English vocabulary words from this image. Return as JSON array with: word, phonetic (IPA), part of speech (n/v/adj/adv), and Vietnamese meaning. Format: [{"word": "word", "phonetic": "/ɪpsəˈluːt/", "type": "(n)", "meaning": "nghia"}]'
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
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Groq API Error:', response.status, errBody);
            throw new Error(`Groq Vision API Error: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '[]';

        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let words;
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
