// ============================================
// QuizLearn - Learn Mode Module
// ============================================

import Toast from '../utils/toast.js';

class LearnModule {
    static vocabulary = [];
    static queue = [];
    static currentWord = null;
    static currentDirection = 'en';
    static errors = 0;
    static settings = {
        multipleChoice: true,
        written: true,
        direction: 'en'
    };

    static init(vocabulary) {
        this.vocabulary = vocabulary || [];
        this.errors = 0;
        this.setupEventListeners();
        this.loadSettings();
    }

    static loadSettings() {
        const saved = localStorage.getItem('quizlearn_learnSettings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {}
        }
        
        // Update UI
        document.getElementById('setting-mc').checked = this.settings.multipleChoice;
        document.getElementById('setting-written').checked = this.settings.written;
        document.getElementById('setting-direction').value = this.settings.direction;
    }

    static setupEventListeners() {
        // Settings toggle
        document.getElementById('learn-settings-btn')?.addEventListener('click', () => {
            document.getElementById('learn-settings-panel')?.classList.toggle('hidden');
        });

        // Save settings
        document.getElementById('save-learn-settings')?.addEventListener('click', () => {
            this.settings.multipleChoice = document.getElementById('setting-mc').checked;
            this.settings.written = document.getElementById('setting-written').checked;
            this.settings.direction = document.getElementById('setting-direction').value;
            
            localStorage.setItem('quizlearn_learnSettings', JSON.stringify(this.settings));
            document.getElementById('learn-settings-panel')?.classList.add('hidden');
            this.start();
        });

        // Restart
        document.getElementById('learn-restart')?.addEventListener('click', () => this.start());

        // Submit answer
        document.getElementById('learn-submit-btn')?.addEventListener('click', () => this.handleWrittenSubmit());
        
        document.getElementById('learn-answer-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleWrittenSubmit();
        });
    }

    static start() {
        if (this.vocabulary.length === 0) {
            Toast.warning('Vui lòng thêm từ vào set để bắt đầu học!');
            return;
        }

        this.queue = [...this.vocabulary].sort(() => Math.random() - 0.5);
        this.errors = 0;

        document.getElementById('learn-restart')?.classList.add('hidden');
        document.getElementById('learn-card-area')?.classList.remove('hidden');
        document.getElementById('learn-results')?.classList.add('hidden');

        this.nextQuestion();
    }

    static nextQuestion() {
        // Remove old memes
        document.querySelectorAll('.meme-feedback').forEach(el => el.remove());

        if (this.queue.length === 0) {
            document.getElementById('learn-card-area')?.classList.add('hidden');
            document.getElementById('learn-results')?.classList.remove('hidden');
            document.getElementById('learn-result-details').textContent = 
                `Bạn đã học ${this.vocabulary.length} từ với ${this.errors} lần sai!`;
            document.getElementById('learn-restart')?.classList.remove('hidden');
            return;
        }

        this.currentWord = this.queue.shift();
        document.getElementById('learn-progress').textContent = 
            `${this.vocabulary.length - this.queue.length} / ${this.vocabulary.length}`;

        const qData = this.getQuestionData(this.currentWord);
        this.currentDirection = qData.direction;

        // Determine question type
        let useWritten = false;
        if (this.settings.multipleChoice && this.settings.written) {
            useWritten = Math.random() > 0.5;
        } else if (this.settings.written) {
            useWritten = true;
        }

        document.getElementById('learn-question').textContent = qData.question;

        if (useWritten) {
            this.showWrittenQuestion(qData.answer);
        } else {
            this.showMultipleChoice(qData.answer, qData.direction);
        }
    }

    static showWrittenQuestion(answer) {
        document.getElementById('learn-options')?.classList.add('hidden');
        document.getElementById('learn-written')?.classList.remove('hidden');
        document.getElementById('learn-answer-input').value = '';
        document.getElementById('learn-answer-input').focus();
        document.getElementById('learn-feedback')?.classList.add('hidden');
    }

    static showMultipleChoice(answer, direction) {
        document.getElementById('learn-written')?.classList.add('hidden');
        document.getElementById('learn-options')?.classList.remove('hidden');
        
        const options = this.generateOptions(answer, direction);
        const container = document.getElementById('learn-options');
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
        const input = document.getElementById('learn-answer-input').value.trim();
        const qData = this.getQuestionData(this.currentWord);
        this.checkAnswer(null, input, qData.answer, 'written');
    }

    static checkAnswer(btn, selected, correct, type) {
        const isCorrect = this.isAnswerMatch(selected, correct);
        const memeHtml = this.getRandomMeme(isCorrect);

        if (type === 'mc') {
            const buttons = document.querySelectorAll('#learn-options .option-btn');
            buttons.forEach(b => b.disabled = true);

            if (isCorrect) {
                btn.classList.add('correct');
            } else {
                this.errors++;
                btn.classList.add('incorrect');
                buttons.forEach(b => {
                    if (this.isAnswerMatch(b.textContent, correct)) {
                        b.classList.add('correct');
                    }
                });
                this.queue.push(this.currentWord); // Learn again
            }
            
            document.getElementById('learn-options').insertAdjacentHTML('beforebegin', memeHtml);
        } else {
            const feedback = document.getElementById('learn-feedback');
            feedback.classList.remove('hidden', 'correct', 'incorrect');
            
            if (isCorrect) {
                feedback.innerHTML = `Chính xác! ${memeHtml}`;
                feedback.classList.add('correct');
            } else {
                this.errors++;
                feedback.innerHTML = `Sai rồi. Đáp án: ${correct} ${memeHtml}`;
                feedback.classList.add('incorrect');
                this.queue.push(this.currentWord);
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
    }
}

window.LearnModule = LearnModule;
export default LearnModule;
