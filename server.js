// ============================================
// QuizLearn - Development Server
// ============================================

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Serve src directory
app.use('/src', express.static(join(__dirname, 'src')));

// Serve memes
app.use('/memes', express.static(join(__dirname, 'memes')));

// Serve public directory
app.use('/public', express.static(join(__dirname, 'public')));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██████╗ ███████╗███████╗███████╗██████╗ ██╗   ██╗███████╗██╗  ██╗   ║
║   ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██║  ╚██╗  ║
║   ██████╔╝█████╗  ███████╗█████╗  ██████╔╝██║   ██║███████╗███████║ ╚██╗ ║
║   ██╔══██╗██╔══╝  ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝╚════██║██╔══██║ ██╔╝ ║
║   ██║  ██║███████╗███████║███████╗██║  ██║ ╚████╔╝ ███████║██║  ██║╔██╔╝ ║
║   ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝   ║
║                                                              ║
║   English Vocabulary Master                                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

🚀 Server running at: http://localhost:${PORT}
📦 Serving static files from: ${__dirname}
✨ Environment: ${process.env.NODE_ENV || 'development'}
    `);
});
