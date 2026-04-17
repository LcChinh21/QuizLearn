export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const region = process.env.AZURE_SPEECH_REGION || process.env.VITE_AZURE_SPEECH_REGION;
        const key = process.env.AZURE_SPEECH_KEY || process.env.VITE_AZURE_SPEECH_KEY;

        if (!region || !key) {
            return res.status(500).json({ error: 'Missing AZURE_SPEECH config in environment.' });
        }

        const tokenRes = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
            }
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            throw new Error(`Failed to fetch Azure token: ${tokenRes.status} ${err}`);
        }

        const token = await tokenRes.text();
        // Trả về token tạm thời thay vì lộ secret key cho Frontend
        res.status(200).json({ token, region });
    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
