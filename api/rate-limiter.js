# ============================================
# QuizLearn - API Rate Limiting Middleware
# ============================================

const rateLimit = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimit.entries()) {
        if (now - value.timestamp > 60000) { // 1 minute window
            rateLimit.delete(key);
        }
    }
}, 300000);

export function rateLimiter(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const key = `${ip}:${req.path}`;
    
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 30; // 30 requests per minute
    
    let record = rateLimit.get(key);
    
    if (!record) {
        record = { count: 0, timestamp: now };
        rateLimit.set(key, record);
    }
    
    // Reset if window expired
    if (now - record.timestamp > windowMs) {
        record.count = 0;
        record.timestamp = now;
    }
    
    record.count++;
    
    // Set rate limit headers
    res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - record.count),
        'X-RateLimit-Reset': Math.ceil((record.timestamp + windowMs) / 1000)
    });
    
    if (record.count > maxRequests) {
        return res.status(429).json({
            error: 'Too many requests',
            details: 'Vui lòng chờ một chút trước khi thử lại.',
            retryAfter: Math.ceil((record.timestamp + windowMs - now) / 1000)
        });
    }
    
    next();
}

export default rateLimiter;
