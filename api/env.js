export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Chỉ trả về URL & Anon Key (cho phép công khai ở Browser)
    // Tuyệt đối không trả về SERVICE_ROLE_KEY ở đây!
    res.status(200).json({
        SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    });
}
