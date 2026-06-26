// ============================================
// QuizLearn - Test Mode Module
// ============================================

import Toast from '../utils/toast.js';

class TestModule {
    static vocabulary = [];
    static queue = [];
    static currentWord = null;
    static currentDirection = 'en';
    static correct = 0;
    static total = 0;
    static settings = {
        multipleChoice: true,
        written: true,
        direction: 'en'
    };

    static init(vocabulary) {
        this.vocabulary = vocabulary || [];
        this.correct = 0;
        this.total = vocabulary?.length || 0;
        this.setupEventListeners();
        this.loadSettings();
    }

    static loadSettings() {
        const saved = localStorage.getItem('quizlearn_testSettings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {}
        }
        
        document.getElementById('test-setting-mc').checked = this.settings.multipleChoice;
        document.getElementById('test-setting-written').checked = this.settings.written;
        document.getElementById('test-setting-direction').value = this.settings.direction;
    }

    static setupEventListeners() {
        document.getElementById('test-settings-btn')?.addEventListener('click', () => {
            document.getElementById('test-settings-panel')?.classList.toggle('hidden');
        });

        document.getElementById('save-test-settings')?.addEventListener('click', () => {
            this.settings.multipleChoice = document.getElementById('test-setting-mc').checked;
            this.settings.written = document.getElementById('test-setting-written').checked;
            this.settings.direction = document.getElementById('test-setting-direction').value;
            
            localStorage.setItem('quizlearn_testSettings', JSON.stringify(this.settings));
            document.getElementById('test-settings-panel')?.classList.add('hidden');
            this.start();
        });

        document.getElementById('test-restart')?.addEventListener('click', () => this.start());

        document.getElementById('test-submit-btn')?.addEventListener('click', () => this.handleWrittenSubmit());
        
        document.getElementById('test-answer-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleWrittenSubmit();
        });
    }

    static start() {
        if (this.vocabulary.length === 0) {
            Toast.warning('Vui lòng thêm từ vào set để làm bài test!');
            return;
        }

        this.queue = [...this.vocabulary].sort(() => Math.random() - 0.5);
        this.total = this.vocabulary.length;
        this.correct = 0;

        document.getElementById('test-restart')?.classList.add('hidden');
        document.getElementById('test-card-area')?.classList.remove('hidden');
        document.getElementById('test-results')?.classList.add('hidden');

        this.nextQuestion();
    }

    static nextQuestion() {
        document.querySelectorAll('.meme-feedback').forEach(el => el.remove());

        if (this.queue.length === 0) {
            document.getElementById('test-card-area')?.classList.add('hidden');
            document.getElementById('test-results')?.classList.remove('hidden');
            
            const pct = Math.round((this.correct / this.total) * 100) || 0;
            const scoreText = document.getElementById('test-score-text');
            scoreText.textContent = `${pct}%`;
            scoreText.style.backgroundColor = pct >= 80 ? 'var(--success-color)' : (pct >= 50 ? 'orange' : 'var(--error-color)');
            
            document.getElementById('test-result-details').textContent = 
                `Đúng: ${this.correct} | Sai: ${this.total - this.correct}`;
            document.getElementById('test-restart')?.classList.remove('hidden');
            return;
        }

        this.currentWord = this.queue.pop();
        document.getElementById('test-progress').textContent = 
            `${this.total - this.queue.length} / ${this.total}`;

        const qData = this.getQuestionData(this.currentWord);
        this.currentDirection = qData.direction;

        let useWritten = false;
        if (this.settings.multipleChoice && this.settings.written) {
            useWritten = Math.random() > 0.5;
        } else if (this.settings.written) {
            useWritten = true;
        }

        document.getElementById('test-question').textContent = qData.question;

        if (useWritten) {
            this.showWrittenQuestion(qData.answer);
        } else {
            this.showMultipleChoice(qData.answer, qData.direction);
        }
    }

    static showWrittenQuestion(answer) {
        document.getElementById('test-options')?.classList.add('hidden');
        document.getElementById('test-written')?.classList.remove('hidden');
        document.getElementById('test-answer-input').value = '';
        document.getElementById('test-answer-input').focus();
        document.getElementById('test-feedback')?.classList.add('hidden');
    }

    static showMultipleChoice(answer, direction) {
        document.getElementById('test-written')?.classList.add('hidden');
        document.getElementById('test-options')?.classList.remove('hidden');
        
        const options = this.generateOptions(answer, direction);
        const container = document.getElementById('test-options');
        container.innerHTML = '';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.onclick = () => this.checkAnswer(btn, opt, answer, 'mc');
            container.appendChild(btn);
        });
    }

    static handleWrittenSubmit() {
        const input = document.getElementById('test-answer-input').value.trim();
        const qData = this.getQuestionData(this.currentWord);
        this.checkAnswer(null, input, qData.answer, 'written');
    }

    static checkAnswer(btn, selected, correct, type) {
        const isCorrect = this.isAnswerMatch(selected, correct);
        const memeHtml = this.getRandomMeme(isCorrect);

        if (type === 'mc') {
            const buttons = document.querySelectorAll('#test-options .option-btn');
            buttons.forEach(b => b.disabled = true);

            if (isCorrect) {
                this.correct++;
                btn.classList.add('correct');
            } else {
                btn.classList.add('incorrect');
                buttons.forEach(b => {
                    if (this.isAnswerMatch(b.textContent, correct)) {
                        b.classList.add('correct');
                    }
                });
            }
            
            document.getElementById('test-options').insertAdjacentHTML('beforebegin', memeHtml);
        } else {
            const feedback = document.getElementById('test-feedback');
            feedback.classList.remove('hidden', 'correct', 'incorrect');
            
            if (isCorrect) {
                this.correct++;
                feedback.innerHTML = `Chính xác! ${memeHtml}`;
                feedback.classList.add('correct');
            } else {
                feedback.innerHTML = `Sai rồi. Đáp án: ${correct} ${memeHtml}`;
                feedback.classList.add('incorrect');
            }
        }

        setTimeout(() => this.nextQuestion(), isCorrect ? 1500 : 2500);
    }

    static isAnswerMatch(userInput, storedAnswer) {
        const inputWords = userInput.toLowerCase().split(',').map(s => s.trim());
        const storedWords = storedAnswer.toLowerCase().split(',').map(s => s.trim());
        return inputWords.some(w => storedWords.includes(w));
    }

    static getQuestionData(wordObj) {
        let direction = this.settings.direction;
        if (direction === 'random') {
            direction = Math.random() > 0.5 ? 'en' : 'vi';
        }
        return {
            direction,
            question: direction === 'en' ? wordObj.meaning : wordObj.word,
            answer: direction === 'en' ? wordObj.word : wordObj.meaning
        };
    }

    static generateOptions(correctAnswer, direction) {
        let options = [correctAnswer];
        let otherWords = [...this.vocabulary]
            .filter(v => (direction === 'en' ? v.word : v.meaning) !== correctAnswer)
            .sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < 3 && i < otherWords.length; i++) {
            options.push(direction === 'en' ? otherWords[i].word : otherWords[i].meaning);
        }
        
        return options.sort(() => Math.random() - 0.5);
    }

    static getRandomMeme(isCorrect) {
        const baseUrl = 'memes';
        const folder = isCorrect ? 'correct' : 'incorrect';
        const num = Math.floor(Math.random() * 5) + 1;
        return `<img class="meme-feedback" src="${baseUrl}/${folder}/${num}.gif" alt="meme feedback" style="max-height: 120px; border-radius: 8px; margin-top: 10px; display: block; margin-left: auto; margin-right: auto; animation: scaleIn 0.3s ease-out;" />`;
    }

    static setVocabulary(vocab) {
        this.vocabulary = vocab || [];
        this.total = this.vocabulary.length;
    }
}

window.TestModule = TestModule;
export default TestModule;
