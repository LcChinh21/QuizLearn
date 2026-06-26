# ============================================
# QuizLearn API Documentation
# ============================================

# QuizLearn REST API v1

Base URL: `https://your-domain.vercel.app/api`

## Authentication

Currently uses Supabase for authentication. API requests are anonymous but rate-limited.

## Rate Limiting

All endpoints are rate-limited:
- **Limit**: 30 requests per minute per IP
- **Headers returned**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Endpoints

### GET /api/env

Returns public environment variables for client initialization.

**Response:**
```json
{
  "SUPABASE_URL": "https://xxx.supabase.co",
  "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST /api/generate

Generate vocabulary words for a topic using AI.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "topic": "Technology",
  "count": 10
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| topic | string | Yes | - | Topic for vocabulary generation |
| count | number | No | 10 | Number of words (5-20) |

**Response:**
```json
{
  "words": [
    {"word": "Algorithm", "meaning": "Thuật toán"},
    {"word": "Database", "meaning": "Cơ sở dữ liệu"},
    {"word": "Interface", "meaning": "Giao diện"}
  ]
}
```

**Errors:**
- `400`: Missing topic
- `429`: Rate limit exceeded
- `500`: API key missing or request failed

---

### POST /api/translate

Translate and get detailed meaning of a word.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "word": "Serendipity"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| word | string | Yes | English word to translate |

**Response:**
```json
{
  "text": "Serendipity: May mắn tình cờ.\n- Từ gốc: Serendipity (infinitive).\n- She discovered the painting by serendipity.: Cô ấy tình cờ phát hiện ra bức tranh đó.\n- Serendipity is finding something good without looking for it.: Serendipity là tìm thấy điều gì đó tốt đẹp mà không cần tìm kiếm.\nSắc thái: Tình cờ may mắn.\nCác trạng thái của từ: Serendipity (infinitive)"
}
```

**Errors:**
- `400`: Missing word
- `429`: Rate limit exceeded
- `500`: API key missing or request failed

---

### GET /api/azure-token

Get temporary Azure Speech token for client-side speech operations.

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "region": "eastus"
}
```

**Errors:**
- `500`: Azure credentials not configured

---

## Example Usage

### cURL

```bash
# Get environment variables
curl https://your-domain.vercel.app/api/env

# Generate words
curl -X POST https://your-domain.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "Science", "count": 5}'

# Translate word
curl -X POST https://your-domain.vercel.app/api/translate \
  -H "Content-Type: application/json" \
  -d '{"word": "Photosynthesis"}'

# Get Azure token
curl https://your-domain.vercel.app/api/azure-token
```

### JavaScript

```javascript
// Generate words
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ topic: 'Business', count: 10 })
});
const data = await response.json();
console.log(data.words);

// Translate word
const translateResponse = await fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ word: 'Eloquent' })
});
const translateData = await translateResponse.json();
console.log(translateData.text);
```

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 405 | Method Not Allowed |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Support

For issues or feature requests, please open an issue on GitHub.
