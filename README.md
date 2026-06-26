# QuizzLearn - English Vocabulary Master

Một ứng dụng web hiện đại để học từ vựng Tiếng Anh với Flashcard, AI Translation, Speech Recognition và nhiều tính năng tương tác.

## Tính năng

### Core Features
- **Flashcard System**: Hệ thống flashcard với animation lật 3D mượt mà
- **Learn Mode**: Chế độ học với Multiple Choice và Written Answer
- **Test Mode**: Kiểm tra kiến thức với điểm số chi tiết
- **AI Word Generation**: Tự động tạo từ vựng theo chủ đề bằng AI (Groq API)
- **AI Translation**: Dịch nghĩa từ vựng thông minh với ví dụ và phát âm
- **Azure Speech Integration**: Text-to-Speech và Pronunciation Assessment

### User Features
- **Authentication**: Hệ thống đăng ký/đăng nhập
- **User Profiles**: Quản lý profile với avatar tùy chỉnh
- **Progress Tracking**: Theo dõi tiến độ học tập
- **Responsive Design**: Giao diện đẹp trên mọi thiết bị
- **PWA Support**: Cài đặt như ứng dụng native
- **Offline Support**: Hoạt động offline với Service Worker

## Công nghệ sử dụng

### Frontend
- **Vanilla JavaScript (ES6+)**: Codebase module hóa, dễ bảo trì
- **CSS3**: Custom CSS với CSS Variables, animations
- **Font Awesome 6**: Icon library
- **PWA**: Service Worker, Manifest

### Backend Services
- **Supabase**: Database và Authentication
- **Groq API**: AI-powered word generation và translation
- **Azure Speech Services**: Text-to-Speech và Pronunciation Assessment

## Cấu trúc dự án

```
QuizLearn/
├── api/                    # Serverless API functions (Vercel)
│   ├── env.js             # Environment variables endpoint
│   ├── generate.js        # AI word generation endpoint
│   ├── translate.js       # AI translation endpoint
│   └── azure-token.js     # Azure Speech token endpoint
├── public/                # Static assets
│   ├── icons/             # PWA icons
│   ├── sw.js             # Service Worker
│   └── manifest.json      # PWA Manifest
├── src/
│   ├── js/
│   │   ├── modules/       # Feature modules
│   │   │   ├── auth.js
│   │   │   ├── dashboard.js
│   │   │   ├── flashcard.js
│   │   │   ├── learn.js
│   │   │   ├── test.js
│   │   │   └── navigation.js
│   │   ├── utils/         # Utility modules
│   │   │   ├── api.js
│   │   │   ├── storage.js
│   │   │   ├── toast.js
│   │   │   └── validator.js
│   │   └── app.js         # Main entry point
│   └── css/
│       └── components.css  # Additional component styles
├── memes/                 # Feedback images
│   ├── correct/
│   └── incorrect/
├── index.html            # Main HTML file
├── style.css             # Main stylesheet
├── docker-compose.yml    # Docker setup
└── vercel.json          # Vercel deployment config
```

## Cài đặt

### Yêu cầu
- Node.js 18+
- npm hoặc yarn
- Docker (optional)

### Local Development

1. **Clone repository**
```bash
git clone https://github.com/LcChinh21/QuizLearn.git
cd QuizLearn
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Tạo file `.env.local`**
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Groq API (for AI features)
VITE_GROQ_API_KEY=your-groq-api-key

# Azure Speech (for TTS & pronunciation)
VITE_AZURE_SPEECH_REGION=eastus
VITE_AZURE_SPEECH_KEY=your-azure-key
```

4. **Chạy development server**
```bash
npm run dev
```

5. **Build cho production**
```bash
npm run build
```

### Docker Deployment

```bash
# Build và chạy container
docker-compose up -d

# Container sẽ chạy ở http://localhost:3000
```

### Vercel Deployment

1. Push code lên GitHub
2. Import project trên Vercel
3. Thêm environment variables trong Vercel dashboard
4. Deploy!

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `GROQ_API_KEY` | Groq API key for AI | Yes |
| `AZURE_SPEECH_REGION` | Azure Speech region | Yes |
| `AZURE_SPEECH_KEY` | Azure Speech API key | Yes |

## API Endpoints

### GET /api/env
Trả về environment variables (Supabase URL và ANON_KEY).

### POST /api/generate
Tạo từ vựng theo chủ đề.

**Request:**
```json
{
  "topic": "Technology",
  "count": 10
}
```

**Response:**
```json
{
  "words": [
    {"word": "Algorithm", "meaning": "Thuật toán"},
    ...
  ]
}
```

### POST /api/translate
Dịch nghĩa từ vựng.

**Request:**
```json
{
  "word": "Serendipity"
}
```

**Response:**
```json
{
  "text": "Serendipity: May mắn tình cờ.\n- Từ gốc: Serendipity (infinitive).\n..."
}
```

### GET /api/azure-token
Lấy Azure Speech token tạm thời.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Chạy development server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | Run linter |
| `npm run format` | Format code |

## Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## Acknowledgments

- [Supabase](https://supabase.com) - Backend as a Service
- [Groq](https://groq.com) - Fast AI inference
- [Azure Speech](https://azure.microsoft.com/services/cognitive-services/speech-services/) - Speech services
- [Font Awesome](https://fontawesome.com) - Icon library
