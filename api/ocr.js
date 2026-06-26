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

        const systemPrompt = `You are an expert at extracting vocabulary from exam/test images for language learning.

TASK:
- Extract English vocabulary words from this exam or test image
- Translate each word to Vietnamese meaning

RULES:
- Return ONLY a plain JSON array, no markdown code blocks
- Each word format: {"word": "english_word", "meaning": "vietnamese_meaning"}
- For vocabulary tests: extract the target words (usually the words being tested, not the options/answers)
- For reading comprehension: extract important/new vocabulary words
- Ignore: numbers, names, dates, trivial words (a, the, is, are, etc.)
- Return max 15 most meaningful words from the image
- Ensure valid JSON for parsing`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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
                                text: 'This is an exam/test image. Extract the vocabulary words being tested (not the answer options) and translate them to Vietnamese. Focus on: vocabulary items, important words in reading passages, or words that test-takers need to know. Return JSON array.'
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
