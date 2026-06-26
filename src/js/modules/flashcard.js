// ============================================
// QuizLearn - Flashcard Module
// ============================================

import Toast from '../utils/toast.js';
import StorageManager from '../utils/storage.js';
import ApiClient from '../utils/api.js';

class FlashcardModule {
    static currentIndex = 0;
    static vocabulary = [];
    static currentWordForSpeech = '';
    static speechSynthesizer = null;

    static init(vocabulary) {
        this.vocabulary = vocabulary || [];
        this.currentIndex = 0;
        this.setupEventListeners();
        this.updateCard();
    }

    static setupEventListeners() {
        // Flashcard click to flip
        const flashcard = document.getElementById('flashcard');
        flashcard?.addEventListener('click', () => {
            if (this.vocabulary.length > 0) {
                flashcard.classList.toggle('is-flipped');
            }
        });

        // Navigation buttons
        document.getElementById('prev-btn')?.addEventListener('click', () => {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.updateCard();
            }
        });

        document.getElementById('next-btn')?.addEventListener('click', () => {
            if (this.currentIndex < this.vocabulary.length - 1) {
                this.currentIndex++;
                this.updateCard();
            }
        });

        // AI Translation
        document.getElementById('gemini-btn')?.addEventListener('click', () => this.handleTranslation());

        // TTS
        document.getElementById('tts-btn')?.addEventListener('click', () => this.handleTTS());

        // Pronunciation check
        document.getElementById('pronounce-btn')?.addEventListener('click', () => this.handlePronunciation());

        // Add word
        document.getElementById('add-word-btn')?.addEventListener('click', () => this.handleAddWord());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const flashcardsSection = document.getElementById('flashcards-section');
            if (flashcardsSection?.classList.contains('hidden')) return;
            if (document.activeElement.tagName === 'INPUT') return;

            switch (e.key) {
                case 'ArrowRight':
                    document.getElementById('next-btn')?.click();
                    break;
                case 'ArrowLeft':
                    document.getElementById('prev-btn')?.click();
                    break;
                case ' ':
                case 'ArrowUp':
                case 'ArrowDown':
                    e.preventDefault();
                    flashcard?.classList.toggle('is-flipped');
                    break;
            }
        });
    }

    static updateCard() {
        const cardFront = document.getElementById('card-front');
        const cardBack = document.getElementById('card-back');
        const cardCounter = document.getElementById('card-counter');

        if (this.vocabulary.length === 0) {
            cardFront.textContent = 'No words';
            cardBack.textContent = 'Please add words first';
            cardCounter.textContent = '0 / 0';
            return;
        }

        if (this.currentIndex >= this.vocabulary.length) {
            this.currentIndex = 0;
        }

        const currentWord = this.vocabulary[this.currentIndex];
        cardFront.textContent = currentWord.word;
        cardBack.textContent = currentWord.meaning;
        cardCounter.textContent = `${this.currentIndex + 1} / ${this.vocabulary.length}`;

        // Reset flip state
        const flashcard = document.getElementById('flashcard');
        flashcard?.classList.remove('is-flipped');
    }

    static async handleTranslation() {
        const word = document.getElementById('ai-lookup-input')?.value.trim();
        if (!word) {
            return Toast.error('Vui lòng nhập từ tiếng Anh để AI dịch nghĩa!');
        }

        const btn = document.getElementById('gemini-btn');
        const originalText = btn.innerHTML;
        const resultBox = document.getElementById('ai-result-box');

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang dịch...';
        btn.disabled = true;
        resultBox.classList.remove('hidden');
        resultBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang suy nghĩ...';

        try {
            const data = await ApiClient.translateWord(word);
            const meaning = data.text?.trim() || '';

            if (meaning) {
                resultBox.innerHTML = this.formatTranslationResult(meaning);
                
                // Auto-fill inputs
                document.getElementById('new-word').value = word;
                
                const firstLine = meaning.split('\n')[0] || '';
                if (firstLine.includes(':')) {
                    const rawMeaning = firstLine.split(':')[1]
                        .trim()
                        .replace(/^['"*\\s]+|['"*\\s.]+$/g, '')
                        .trim();
                    document.getElementById('new-meaning').value = rawMeaning;
                }

                // Enable speech controls
                this.currentWordForSpeech = word;
                document.getElementById('speech-controls').style.display = 'flex';
                document.getElementById('pronounce-result').style.display = 'none';
            } else {
                resultBox.innerHTML = 'Không tìm thấy nghĩa của từ này.';
                document.getElementById('speech-controls').style.display = 'none';
            }
        } catch (error) {
            console.error('Translation error:', error);
            resultBox.innerHTML = `<span style="color: red;">Lỗi khi dịch: ${error.message}</span>`;
            document.getElementById('speech-controls').style.display = 'none';
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    static formatTranslationResult(meaning) {
        let html = '';
        const lines = meaning.split('\n').filter(l => l.trim() !== '');

        lines.forEach((line, idx) => {
            if (idx === 0 && line.includes(':')) {
                const parts = line.split(':');
                const word = parts[0].trim().replace(/^['"*\\s]+|['"*\\s]+$/g, '');
                let def = parts.slice(1).join(':').trim().replace(/^['"*\\s]+|['"*\\s]+$/g, '');
                if (!def.endsWith('.')) def += '.';

                html += `<div style="margin-bottom: 12px; font-size: 1.2rem; display: flex; align-items: baseline;">
                    <span style="background: var(--primary-color, #4255ff); color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; margin-right: 8px;">${word}</span>
                    <span style="font-weight: bold; color: #2c3e50;">${def}</span>
                </div>`;
            } else if (line.trim().startsWith('-')) {
                let content = line.replace(/^-/, '').trim();
                if (!content.endsWith('.')) content += '.';
                
                if (content.includes(':')) {
                    const cParts = content.split(':');
                    html += `<div style="margin: 8px 0 8px 15px; padding-left: 12px; border-left: 4px solid #f39c12; color: #34495e; line-height: 1.5;"><strong>${cParts[0].trim()}</strong>: ${cParts.slice(1).join(':').trim()}</div>`;
                } else {
                    html += `<div style="margin: 8px 0 8px 15px; padding-left: 12px; border-left: 4px solid #f39c12; color: #34495e; line-height: 1.5;">${content}</div>`;
                }
            } else {
                let text = line.replace(/\*\*/g, '').trim();
                if (!text.endsWith('.')) text += '.';
                html += `<div style="margin-top: 12px; font-size: 0.95rem; font-style: italic; color: #7f8c8d; background: #e8ecef; padding: 8px 12px; border-radius: 6px;"><i class="fas fa-info-circle"></i> ${text}</div>`;
            }
        });

        return html;
    }

    static async handleTTS() {
        if (!this.currentWordForSpeech) return;

        const btn = document.getElementById('tts-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        try {
            const speechConfig = await this.getAzureSpeechConfig();
            speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';

            const synthesizer = new window.SpeechSDK.SpeechSynthesizer(speechConfig);
            
            synthesizer.speakTextAsync(
                this.currentWordForSpeech,
                () => {
                    synthesizer.close();
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-volume-up"></i> Nghe mẫu';
                },
                (error) => {
                    console.error(error);
                    synthesizer.close();
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-volume-up"></i> Nghe mẫu';
                    Toast.error('Lỗi phát âm: ' + error.message);
                }
            );
        } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-volume-up"></i> Nghe mẫu';
            Toast.error('Lỗi phát âm: ' + err.message);
        }
    }

    static async handlePronunciation() {
        if (!this.currentWordForSpeech) return;

        const btn = document.getElementById('pronounce-btn');
        const resultSpan = document.getElementById('pronounce-result');

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang nghe...';
        resultSpan.style.display = 'none';

        try {
            const speechConfig = await this.getAzureSpeechConfig();
            const audioConfig = window.SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

            const pronunciationConfig = new window.SpeechSDK.PronunciationAssessmentConfig(
                this.currentWordForSpeech,
                window.SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
                window.SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
                true
            );

            const recognizer = new window.SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            pronunciationConfig.applyTo(recognizer);

            recognizer.recognizeOnceAsync(
                (result) => {
                    if (result.reason === window.SpeechSDK.ResultReason.RecognizedSpeech) {
                        const assessmentResult = window.SpeechSDK.PronunciationAssessmentResult.fromResult(result);
                        const score = assessmentResult.pronunciationScore;
                        
                        resultSpan.style.display = 'inline-flex';
                        if (score >= 80) {
                            resultSpan.innerHTML = `<span style="color: #2ecc71;"><i class="fas fa-check-circle"></i> Tuyệt vời! Điểm: ${score}/100</span>`;
                        } else if (score >= 60) {
                            resultSpan.innerHTML = `<span style="color: #f39c12;"><i class="fas fa-exclamation-triangle"></i> Khá tốt! Điểm: ${score}/100</span>`;
                        } else {
                            resultSpan.innerHTML = `<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Cần cố gắng hơn. Điểm: ${score}/100</span>`;
                        }
                    } else {
                        resultSpan.style.display = 'inline-flex';
                        resultSpan.innerHTML = `<span style="color: #e74c3c;">Không nhận dạng được giọng nói. Thử lại nhé.</span>`;
                    }
                    
                    recognizer.close();
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-microphone"></i> Kiểm tra phát âm';
                },
                (err) => {
                    console.error(err);
                    recognizer.close();
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-microphone"></i> Kiểm tra phát âm';
                    Toast.error('Lỗi ghi âm: Cần cấp quyền truy cập Microphone.');
                }
            );
        } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-microphone"></i> Kiểm tra phát âm';
            Toast.error('Lỗi kiểm tra phát âm: ' + err.message);
        }
    }

    static async getAzureSpeechConfig() {
        const data = await ApiClient.getAzureToken();
        return window.SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
    }

    static handleAddWord() {
        if (!window.AuthModule?.isAuthenticated()) {
            Toast.warning('Vui lòng đăng nhập để thêm từ!');
            document.getElementById('auth-panel')?.classList.add('show');
            return;
        }

        const word = document.getElementById('new-word')?.value.trim();
        const meaning = document.getElementById('new-meaning')?.value.trim();

        if (!word || !meaning) {
            return Toast.error('Vui lòng điền đầy đủ từ và nghĩa!');
        }

        this.vocabulary.push({ word, meaning });
        
        // Trigger save in parent
        if (typeof window.onWordAdded === 'function') {
            window.onWordAdded(this.vocabulary);
        }

        document.getElementById('new-word').value = '';
        document.getElementById('new-meaning').value = '';
        document.getElementById('ai-result-box').classList.add('hidden');
        document.getElementById('speech-controls').style.display = 'none';

        this.updateCard();
        this.renderWordList();
        Toast.success(`Đã thêm từ "${word}"!`);
    }

    static renderWordList() {
        const container = document.getElementById('word-list-container');
        const totalCount = document.getElementById('total-words-count');
        
        container.innerHTML = '';
        totalCount.textContent = this.vocabulary.length;

        this.vocabulary.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div class="list-word">${item.word}</div>
                <div class="list-meaning">${item.meaning}</div>
                <button class="delete-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
            `;
            
            div.querySelector('.delete-btn')?.addEventListener('click', () => {
                if (!window.AuthModule?.isAuthenticated()) {
                    Toast.warning('Vui lòng đăng nhập để xóa từ!');
                    return;
                }
                this.deleteWord(index);
            });

            container.appendChild(div);
        });
    }

    static deleteWord(index) {
        const word = this.vocabulary[index];
        if (confirm(`Xóa từ "${word?.word}"?`)) {
            this.vocabulary.splice(index, 1);
            
            if (this.currentIndex >= this.vocabulary.length && this.currentIndex > 0) {
                this.currentIndex--;
            }
            
            this.updateCard();
            this.renderWordList();
            
            if (typeof window.onWordChanged === 'function') {
                window.onWordChanged(this.vocabulary);
            }
            
            Toast.success('Đã xóa từ!');
        }
    }

    static setVocabulary(vocab) {
        this.vocabulary = vocab || [];
        this.currentIndex = 0;
        this.updateCard();
        this.renderWordList();
    }
}

window.FlashcardModule = FlashcardModule;
export default FlashcardModule;
