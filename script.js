// ============================================
// QuizLearn - Main Application
// ============================================

// ----- Constants -----
const SUPABASE_TABLE = "study_sets";
const USERS_TABLE = "quizlearn_users";

// ----- State -----
let supabaseClient = null;
let isSupabaseLoaded = false;
let appData = [];
let currentSetId = null;
let vocabulary = [];
let currentUser = null;
let usersDb = [];

// ----- Toast System -----
const Toast = {
    container: null,
    
    init() {
        if (this.container) return;
        this.container = document.getElementById('toast-container');
    },
    
    show(message, type = 'info', duration = 4000) {
        this.init();
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#4255ff'
        };

        const toast = document.createElement('div');
        toast.style.cssText = `
            padding: 16px 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease;
            border-left: 4px solid ${colors[type]};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin-bottom: 10px;
        `;

        toast.innerHTML = `
            <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 1.4rem;"></i>
            <span style="flex: 1; color: #2d3748; font-size: 0.95rem; line-height: 1.4;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #a0aec0; cursor: pointer; font-size: 1.2rem; padding: 4px;">&times;</button>
        `;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); },
    info(message) { this.show(message, 'info'); }
};
window.Toast = Toast;

// ----- Storage Manager -----
const Storage = {
    prefix: 'quizlearn_',
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    },
    
    remove(key) {
        localStorage.removeItem(this.prefix + key);
    }
};

// ----- API Client -----
const API = {
    baseUrl: '/api',
    timeout: 30000,
    
    async request(endpoint, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: { 'Content-Type': 'application/json', ...options.headers },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || data.details || 'Request failed');
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') throw new Error('Yêu cầu bị hết thời gian.');
            throw error;
        }
    },
    
    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); },
    async getEnv() { return this.get('/env'); },
    async generateWords(topic, count) { return this.post('/generate', { topic, count }); },
    async translateWord(word) { return this.post('/translate', { word }); },
    async getAzureToken() { return this.get('/azure-token'); }
};

// ----- Supabase Setup -----
async function setupSupabase() {
    if (isSupabaseLoaded) return;
    try {
        const env = await API.getEnv();
        if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY && window.supabase) {
            supabaseClient = window.supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
        }
        isSupabaseLoaded = true;
    } catch (e) {
        console.warn("Offline mode:", e);
        isSupabaseLoaded = true;
    }
}

// ----- Data Management -----
function loadData() {
    appData = Storage.get('data', []);
    appData = appData.map(set => ({
        id: set.id || Date.now(),
        name: set.name || "Untitled Set",
        words: Array.isArray(set.words) ? set.words : []
    }));
    if (!Array.isArray(appData)) appData = [];
}

async function syncFromSupabase() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from(SUPABASE_TABLE).select('*');
        if (!error && data && data.length > 0) {
            appData = data;
            Storage.set('data', appData);
        }
        const { data: usersData } = await supabaseClient.from(USERS_TABLE).select('*');
        if (usersData) {
            usersDb = usersData;
            Storage.set('users', usersDb);
        }
    } catch (e) {
        console.warn("Supabase sync failed:", e);
    }
}

async function saveData() {
    if (!currentSetId) return;
    const idx = appData.findIndex(s => s.id === currentSetId);
    if (idx > -1) {
        appData[idx].words = vocabulary;
        Storage.set('data', appData);
        
        if (supabaseClient) {
            await supabaseClient.from(SUPABASE_TABLE).upsert({
                id: appData[idx].id,
                name: appData[idx].name,
                words: vocabulary,
                author: appData[idx].author
            }).catch(e => console.warn("Sync failed:", e));
        }
    }
}

async function saveSetToSupabase(newSet) {
    if (supabaseClient) {
        await supabaseClient.from(SUPABASE_TABLE).upsert(newSet).catch(e => console.warn("Sync failed:", e));
    }
}

// ----- User Auth -----
function loadCurrentUser() {
    const savedUser = Storage.get('currentUser');
    if (savedUser) currentUser = savedUser;
    usersDb = Storage.get('users', []);
    updateAuthUI();
}

function updateAuthUI() {
    const btnText = document.getElementById("auth-display-name");
    const avatarImg = document.getElementById("auth-avatar-display");
    const iconDisplay = document.getElementById("auth-icon-display");
    const loginView = document.getElementById("login-form-view");
    const regView = document.getElementById("register-form-view");
    const profView = document.getElementById("profile-view");

    if (currentUser) {
        btnText.textContent = currentUser.displayName || currentUser.username;
        iconDisplay.style.display = "none";
        avatarImg.style.display = "block";
        avatarImg.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=random`;
        loginView.classList.add("hidden");
        regView.classList.add("hidden");
        profView.classList.remove("hidden");
        document.getElementById("profile-avatar-preview").src = avatarImg.src;
    } else {
        btnText.textContent = "Login";
        iconDisplay.style.display = "inline-block";
        avatarImg.style.display = "none";
        loginView.classList.remove("hidden");
        regView.classList.add("hidden");
        profView.classList.add("hidden");
    }
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(16);
}

function checkAuth() {
    if (!currentUser) {
        Toast.warning('Vui lòng đăng nhập để thực hiện chức năng này!');
        document.getElementById("auth-panel").classList.add("show");
        return false;
    }
    return true;
}

// ----- DOM Elements -----
const tabDashboard = document.getElementById("tab-dashboard");
const tabFlashcards = document.getElementById("tab-flashcards");
const tabLearn = document.getElementById("tab-learn");
const tabTest = document.getElementById("tab-test");
const flashcard = document.getElementById("flashcard");
const cardFront = document.getElementById("card-front");
const cardBack = document.getElementById("card-back");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const cardCounter = document.getElementById("card-counter");
const wordListContainer = document.getElementById("word-list-container");
const totalWordsCount = document.getElementById("total-words-count");

let flashcardIndex = 0;
let learnErrors = 0;
let testCorrect = 0;
let testTotal = 0;
let learnQueue = [];
let testQueue = [];

// ----- Navigation -----
document.querySelectorAll(".nav-btn[data-target]").forEach(btn => {
    btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        if (!targetId) return;
        
        document.querySelectorAll(".nav-btn[data-target]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        document.querySelectorAll(".app-section").forEach(s => s.classList.add("hidden"));
        document.getElementById(targetId)?.classList.remove("hidden");
        
        if (targetId === "dashboard-section") {
            renderDashboard();
            tabFlashcards.classList.add("hidden");
            tabLearn.classList.add("hidden");
            tabTest.classList.add("hidden");
            currentSetId = null;
        } else if (targetId === "flashcards-section") {
            initFlashcards();
        } else if (targetId === "learn-section") {
            startLearnMode();
        } else if (targetId === "test-section") {
            startTestMode();
        }
    });
});

// ----- Dashboard -----
function renderDashboard() {
    const grid = document.getElementById("set-grid");
    grid.innerHTML = "";
    appData.forEach(set => {
        const card = document.createElement("div");
        card.className = "set-card";
        card.onclick = (e) => {
            if (e.target.closest('.delete-set-btn') || e.target.closest('.edit-set-btn')) return;
            openSet(set.id);
        };
        
        let controlsHtml = '';
        if (currentUser && (!set.author || set.author.username === currentUser.username)) {
            controlsHtml = `
                <button class="edit-set-btn" onclick="editSet(${set.id})" title="Edit" style="margin-right: 10px; border: none; background: none; color: #4255ff; cursor: pointer; font-size: 1.1rem;"><i class="fas fa-edit"></i></button>
                <button class="delete-set-btn" onclick="deleteSet(${set.id})"><i class="fas fa-trash"></i></button>
            `;
        }

        card.innerHTML = `
            <div style="margin-bottom: 12px;">
                <div class="set-card-title">${set.name}</div>
            </div>
            <div>
                <span class="set-card-count">${set.words.length} terms</span>
            </div>
            <div class="set-card-footer">
                ${controlsHtml}
                <i class="fas fa-chevron-right" style="color: var(--text-light);"></i>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.getElementById("create-set-btn").addEventListener("click", async () => {
    if (!checkAuth()) return;
    const name = document.getElementById("new-set-name").value.trim();
    if (!name) return Toast.error('Vui lòng nhập tên set!');
    
    const newSet = {
        id: Date.now(),
        name,
        words: [],
        author: currentUser ? { username: currentUser.username, displayName: currentUser.displayName } : null
    };
    appData.push(newSet);
    Storage.set('data', appData);
    document.getElementById("new-set-name").value = '';
    renderDashboard();
    await saveSetToSupabase(newSet);
    Toast.success(`Đã tạo set "${name}"!`);
});

document.getElementById("generate-set-btn").addEventListener("click", async () => {
    if (!checkAuth()) return;
    const topic = document.getElementById("ai-topic-name").value.trim();
    const count = parseInt(document.getElementById("ai-word-count").value) || 10;
    if (!topic) return Toast.error('Vui lòng nhập chủ đề!');
    
    const btn = document.getElementById("generate-set-btn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
    btn.disabled = true;
    
    try {
        const data = await API.generateWords(topic, count);
        if (data.words?.length > 0) {
            const newSet = {
                id: Date.now(),
                name: `Topic: ${topic}`,
                words: data.words,
                author: currentUser ? { username: currentUser.username, displayName: currentUser.displayName } : null
            };
            appData.unshift(newSet);
            Storage.set('data', appData);
            document.getElementById("ai-topic-name").value = '';
            renderDashboard();
            await saveSetToSupabase(newSet);
            Toast.success(`Đã tạo ${data.words.length} từ vựng về "${topic}"!`);
        }
    } catch (error) {
        Toast.error(`Lỗi: ${error.message}`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

window.editSet = async function(id) {
    if (!checkAuth()) return;
    const setObj = appData.find(s => s.id === id);
    if (!setObj) return;
    const newName = prompt("Nhập tên mới:", setObj.name);
    if (newName?.trim()) {
        setObj.name = newName.trim();
        Storage.set('data', appData);
        renderDashboard();
        if (supabaseClient) {
            await supabaseClient.from(SUPABASE_TABLE).update({ name: setObj.name }).eq('id', id).catch(() => {});
        }
        Toast.success('Đã cập nhật tên set!');
    }
};

window.deleteSet = async function(id) {
    if (!checkAuth()) return;
    const setObj = appData.find(s => s.id === id);
    if (!setObj) return;
    if (confirm(`Xóa set "${setObj.name}"?`)) {
        appData = appData.filter(s => s.id !== id);
        Storage.set('data', appData);
        renderDashboard();
        if (supabaseClient) {
            await supabaseClient.from(SUPABASE_TABLE).delete().eq('id', id).catch(() => {});
        }
        Toast.success('Đã xóa set!');
    }
};

function openSet(id) {
    currentSetId = id;
    const setObj = appData.find(s => s.id === id);
    if (!setObj) return;
    vocabulary = setObj.words || [];
    
    document.getElementById("current-set-title-display").textContent = setObj.name;
    document.getElementById("learn-set-title-display").textContent = setObj.name + " - Learn Mode";
    document.getElementById("test-set-title-display").textContent = setObj.name + " - Test Mode";
    
    tabFlashcards.classList.remove("hidden");
    tabLearn.classList.remove("hidden");
    tabTest.classList.remove("hidden");
    tabFlashcards.click();
}

// ----- Flashcards -----
function initFlashcards() {
    if (vocabulary.length === 0) {
        cardFront.textContent = "No words";
        cardBack.textContent = "Add words to start";
        cardCounter.textContent = "0 / 0";
    } else {
        if (flashcardIndex >= vocabulary.length) flashcardIndex = 0;
        updateCard();
    }
    renderWordList();
}

function updateCard() {
    if (vocabulary.length === 0) return;
    const word = vocabulary[flashcardIndex];
    cardFront.textContent = word.word;
    cardBack.textContent = word.meaning;
    cardCounter.textContent = `${flashcardIndex + 1} / ${vocabulary.length}`;
    flashcard.classList.remove("is-flipped");
}

flashcard.addEventListener("click", () => {
    if (vocabulary.length > 0) flashcard.classList.toggle("is-flipped");
});
prevBtn.addEventListener("click", () => { if (flashcardIndex > 0) { flashcardIndex--; updateCard(); } });
nextBtn.addEventListener("click", () => { if (flashcardIndex < vocabulary.length - 1) { flashcardIndex++; updateCard(); } });

// ----- AI Translation -----
document.getElementById("gemini-btn").addEventListener("click", async () => {
    const word = document.getElementById("ai-lookup-input").value.trim();
    if (!word) return Toast.error('Vui lòng nhập từ!');
    
    const btn = document.getElementById("gemini-btn");
    const originalText = btn.innerHTML;
    const resultBox = document.getElementById("ai-result-box");
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang dịch...';
    btn.disabled = true;
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang suy nghĩ...';
    
    try {
        const data = await API.translateWord(word);
        if (data.text) {
            resultBox.innerHTML = formatTranslation(data.text);
            document.getElementById("new-word").value = word;
            const firstLine = data.text.split('\n')[0] || '';
            if (firstLine.includes(':')) {
                document.getElementById("new-meaning").value = firstLine.split(':')[1].trim().replace(/^['"*\\s]+|['"*\\s.]+$/g, '');
            }
            window.currentWordForSpeech = word;
            document.getElementById("speech-controls").style.display = "flex";
        }
    } catch (error) {
        resultBox.innerHTML = `<span style="color: red;">Lỗi: ${error.message}</span>`;
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

function formatTranslation(text) {
    let html = '';
    text.split('\n').filter(l => l.trim()).forEach((line, idx) => {
        if (idx === 0 && line.includes(':')) {
            const parts = line.split(':');
            const word = parts[0].trim().replace(/^['"*\\s]+|['"*\\s]+$/g, '');
            let def = parts.slice(1).join(':').trim().replace(/^['"*\\s]+|['"*\\s]+$/g, '');
            if (!def.endsWith('.')) def += '.';
            html += `<div style="margin-bottom: 12px; font-size: 1.2rem; display: flex; align-items: baseline;">
                <span style="background: var(--primary-color); color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; margin-right: 8px;">${word}</span>
                <span style="font-weight: bold; color: #2c3e50;">${def}</span>
            </div>`;
        } else if (line.trim().startsWith('-')) {
            let content = line.replace(/^-/, '').trim();
            if (!content.endsWith('.')) content += '.';
            html += `<div style="margin: 8px 0 8px 15px; padding-left: 12px; border-left: 4px solid #f39c12; color: #34495e;">${content}</div>`;
        } else {
            let text = line.replace(/\*\*/g, '').trim();
            if (!text.endsWith('.')) text += '.';
            html += `<div style="margin-top: 12px; font-size: 0.95rem; font-style: italic; color: #7f8c8d; background: #e8ecef; padding: 8px 12px; border-radius: 6px;"><i class="fas fa-info-circle"></i> ${text}</div>`;
        }
    });
    return html;
}

// ----- Speech -----
window.currentWordForSpeech = "";

document.getElementById("tts-btn").addEventListener("click", async () => {
    if (!window.currentWordForSpeech) return;
    const btn = document.getElementById("tts-btn");
    btn.disabled = true;
    
    try {
        const res = await API.getAzureToken();
        const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(res.token, res.region);
        speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
        synthesizer.speakTextAsync(window.currentWordForSpeech, () => {
            synthesizer.close();
            btn.disabled = false;
        }, () => {
            synthesizer.close();
            btn.disabled = false;
        });
    } catch (err) {
        Toast.error('Lỗi TTS: ' + err.message);
        btn.disabled = false;
    }
});

document.getElementById("pronounce-btn").addEventListener("click", async () => {
    if (!window.currentWordForSpeech) return;
    const btn = document.getElementById("pronounce-btn");
    const result = document.getElementById("pronounce-result");
    btn.disabled = true;
    result.style.display = "none";
    
    try {
        const res = await API.getAzureToken();
        const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(res.token, res.region);
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const pronunciationConfig = new SpeechSDK.PronunciationAssessmentConfig(
            window.currentWordForSpeech,
            SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
            SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
            true
        );
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
        pronunciationConfig.applyTo(recognizer);
        recognizer.recognizeOnceAsync(
            (result) => {
                if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    const score = SpeechSDK.PronunciationAssessmentResult.fromResult(result).pronunciationScore;
                    result.style.display = "inline-flex";
                    result.innerHTML = score >= 80 ? 
                        `<span style="color: #2ecc71;"><i class="fas fa-check-circle"></i> Tuyệt vời! ${score}/100</span>` :
                        score >= 60 ?
                        `<span style="color: #f39c12;"><i class="fas fa-exclamation-triangle"></i> Khá tốt! ${score}/100</span>` :
                        `<span style="color: #e74c3c;"><i class="fas fa-times-circle"></i> Cần cố gắng! ${score}/100</span>`;
                }
                recognizer.close();
                btn.disabled = false;
            },
            () => {
                Toast.error('Lỗi microphone');
                recognizer.close();
                btn.disabled = false;
            }
        );
    } catch (err) {
        Toast.error('Lỗi: ' + err.message);
        btn.disabled = false;
    }
});

// ----- Word Management -----
document.getElementById("add-word-btn").addEventListener("click", () => {
    if (!checkAuth()) return;
    const word = document.getElementById("new-word").value.trim();
    const meaning = document.getElementById("new-meaning").value.trim();
    if (!word || !meaning) return Toast.error('Vui lòng nhập đầy đủ!');
    
    vocabulary.push({ word, meaning });
    saveData();
    document.getElementById("new-word").value = '';
    document.getElementById("new-meaning").value = '';
    document.getElementById("ai-result-box").classList.add("hidden");
    document.getElementById("speech-controls").style.display = "none";
    initFlashcards();
    Toast.success(`Đã thêm từ "${word}"!`);
});

function renderWordList() {
    wordListContainer.innerHTML = "";
    totalWordsCount.textContent = vocabulary.length;
    vocabulary.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `<div class="list-word">${item.word}</div><div class="list-meaning">${item.meaning}</div><button class="delete-btn" onclick="deleteWord(${index})"><i class="fas fa-trash"></i></button>`;
        wordListContainer.appendChild(div);
    });
}

window.deleteWord = function(index) {
    if (!checkAuth()) return;
    vocabulary.splice(index, 1);
    saveData();
    initFlashcards();
    Toast.success('Đã xóa từ!');
};

// ----- Learn Mode -----
document.getElementById("learn-settings-btn").addEventListener("click", () => {
    document.getElementById("learn-settings-panel").classList.toggle("hidden");
});

document.getElementById("save-learn-settings").addEventListener("click", () => {
    document.getElementById("learn-settings-panel").classList.add("hidden");
    startLearnMode();
});

function startLearnMode() {
    if (vocabulary.length === 0) return Toast.warning('Thêm từ để học!');
    learnQueue = [...vocabulary].sort(() => Math.random() - 0.5);
    learnErrors = 0;
    document.getElementById("learn-card-area").classList.remove("hidden");
    document.getElementById("learn-results").classList.add("hidden");
    nextLearnQuestion();
}

function nextLearnQuestion() {
    document.querySelectorAll(".meme-feedback").forEach(el => el.remove());
    
    if (learnQueue.length === 0) {
        document.getElementById("learn-card-area").classList.add("hidden");
        document.getElementById("learn-results").classList.remove("hidden");
        document.getElementById("learn-result-details").textContent = `Học xong ${vocabulary.length} từ với ${learnErrors} lần sai!`;
        return;
    }
    
    const word = learnQueue.shift();
    const direction = document.getElementById("setting-direction").value;
    const isEnglish = direction === "random" ? Math.random() > 0.5 : direction === "en";
    
    document.getElementById("learn-progress").textContent = `${vocabulary.length - learnQueue.length}/${vocabulary.length}`;
    document.getElementById("learn-question").textContent = isEnglish ? word.meaning : word.word;
    
    const options = generateOptions(isEnglish ? word.word : word.meaning, isEnglish);
    const container = document.getElementById("learn-options");
    container.innerHTML = "";
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.onclick = () => checkLearnAnswer(btn, opt, isEnglish ? word.word : word.meaning);
        container.appendChild(btn);
    });
}

function generateOptions(correct, isEnglish) {
    let opts = [correct];
    const others = vocabulary.filter(v => (isEnglish ? v.word : v.meaning) !== correct).sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3 && i < others.length; i++) opts.push(isEnglish ? others[i].word : others[i].meaning);
    return opts.sort(() => Math.random() - 0.5);
}

function checkLearnAnswer(btn, selected, correct) {
    const isCorrect = selected.toLowerCase() === correct.toLowerCase();
    const meme = getRandomMeme(isCorrect);
    const buttons = document.querySelectorAll("#learn-options .option-btn");
    buttons.forEach(b => b.disabled = true);
    
    if (isCorrect) {
        btn.classList.add("correct");
    } else {
        learnErrors++;
        btn.classList.add("incorrect");
        buttons.forEach(b => { if (b.textContent.toLowerCase() === correct.toLowerCase()) b.classList.add("correct"); });
        learnQueue.push(vocabulary[vocabulary.findIndex(v => v.word === correct)]);
    }
    document.getElementById("learn-options").insertAdjacentHTML("beforebegin", meme);
    setTimeout(nextLearnQuestion, isCorrect ? 1500 : 2500);
}

document.getElementById("learn-submit-btn").addEventListener("click", () => {
    const input = document.getElementById("learn-answer-input").value.trim();
    const word = vocabulary[vocabulary.length - learnQueue.length - 1];
    const isEnglish = document.getElementById("setting-direction").value === "en";
    const correct = isEnglish ? word.word : word.meaning;
    checkLearnAnswer(null, input, correct);
});

document.getElementById("learn-restart").addEventListener("click", startLearnMode);

function getRandomMeme(isCorrect) {
    const num = Math.floor(Math.random() * 5) + 1;
    return `<img class="meme-feedback" src="memes/${isCorrect ? 'correct' : 'incorrect'}/${num}.gif" style="max-height: 120px; border-radius: 8px; margin: 10px auto; display: block;" />`;
}

// ----- Test Mode -----
document.getElementById("test-settings-btn").addEventListener("click", () => {
    document.getElementById("test-settings-panel").classList.toggle("hidden");
});

document.getElementById("save-test-settings").addEventListener("click", () => {
    document.getElementById("test-settings-panel").classList.add("hidden");
    startTestMode();
});

function startTestMode() {
    if (vocabulary.length === 0) return Toast.warning('Thêm từ để test!');
    testQueue = [...vocabulary].sort(() => Math.random() - 0.5);
    testTotal = vocabulary.length;
    testCorrect = 0;
    document.getElementById("test-card-area").classList.remove("hidden");
    document.getElementById("test-results").classList.add("hidden");
    nextTestQuestion();
}

function nextTestQuestion() {
    document.querySelectorAll(".meme-feedback").forEach(el => el.remove());
    
    if (testQueue.length === 0) {
        document.getElementById("test-card-area").classList.add("hidden");
        document.getElementById("test-results").classList.remove("hidden");
        const pct = Math.round((testCorrect / testTotal) * 100);
        document.getElementById("test-score-text").textContent = `${pct}%`;
        document.getElementById("test-score-text").style.backgroundColor = pct >= 80 ? 'var(--success-color)' : pct >= 50 ? 'orange' : 'var(--error-color)';
        document.getElementById("test-result-details").textContent = `Đúng: ${testCorrect} | Sai: ${testTotal - testCorrect}`;
        return;
    }
    
    const word = testQueue.pop();
    const isEnglish = document.getElementById("test-setting-direction").value === "random" ? Math.random() > 0.5 : document.getElementById("test-setting-direction").value === "en";
    
    document.getElementById("test-progress").textContent = `${testTotal - testQueue.length}/${testTotal}`;
    document.getElementById("test-question").textContent = isEnglish ? word.meaning : word.word;
    
    const options = generateOptions(isEnglish ? word.word : word.meaning, isEnglish);
    const container = document.getElementById("test-options");
    container.innerHTML = "";
    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.onclick = () => checkTestAnswer(btn, opt, isEnglish ? word.word : word.meaning);
        container.appendChild(btn);
    });
}

function checkTestAnswer(btn, selected, correct) {
    const isCorrect = selected.toLowerCase() === correct.toLowerCase();
    const meme = getRandomMeme(isCorrect);
    const buttons = document.querySelectorAll("#test-options .option-btn");
    buttons.forEach(b => b.disabled = true);
    
    if (isCorrect) {
        testCorrect++;
        btn.classList.add("correct");
    } else {
        btn.classList.add("incorrect");
        buttons.forEach(b => { if (b.textContent.toLowerCase() === correct.toLowerCase()) b.classList.add("correct"); });
    }
    document.getElementById("test-options").insertAdjacentHTML("beforebegin", meme);
    setTimeout(nextTestQuestion, isCorrect ? 1500 : 2500);
}

document.getElementById("test-restart").addEventListener("click", startTestMode);

// ----- Auth -----
document.getElementById("auth-toggle-btn").addEventListener("click", () => {
    document.getElementById("auth-panel").classList.toggle("show");
});

document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("auth-user-dropdown");
    const panel = document.getElementById("auth-panel");
    if (!dropdown.contains(e.target) && panel.classList.contains("show")) {
        panel.classList.remove("show");
    }
});

document.getElementById("go-to-register").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("login-form-view").classList.add("hidden");
    document.getElementById("register-form-view").classList.remove("hidden");
});

document.getElementById("go-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("register-form-view").classList.add("hidden");
    document.getElementById("login-form-view").classList.remove("hidden");
});

document.getElementById("do-register-btn").addEventListener("click", async () => {
    const username = document.getElementById("reg-username").value.trim();
    const displayName = document.getElementById("reg-displayname").value.trim();
    const password = document.getElementById("reg-password").value;
    
    if (!username || !displayName || !password) return Toast.error('Điền đầy đủ thông tin!');
    if (usersDb.find(u => u.username === username)) return Toast.error('Username đã tồn tại!');
    
    const newUser = { username, displayName, password: hashPassword(password), avatar: '' };
    usersDb.push(newUser);
    Storage.set('users', usersDb);
    
    if (supabaseClient) {
        await supabaseClient.from(USERS_TABLE).insert([newUser]).catch(() => {});
    }
    
    Toast.success('Đăng ký thành công!');
    document.getElementById("reg-username").value = '';
    document.getElementById("reg-displayname").value = '';
    document.getElementById("reg-password").value = '';
    document.getElementById("go-to-login").click();
});

document.getElementById("do-login-btn").addEventListener("click", () => {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    
    const match = usersDb.find(u => u.username === username && u.password === hashPassword(password));
    if (!match) return Toast.error('Sai Username hoặc Password!');
    
    currentUser = match;
    Storage.set('currentUser', currentUser);
    document.getElementById("login-username").value = '';
    document.getElementById("login-password").value = '';
    document.getElementById("auth-panel").classList.remove("show");
    updateAuthUI();
    Toast.success(`Chào mừng, ${currentUser.displayName}!`);
});

document.getElementById("prof-avatar-upload").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById("profile-avatar-preview").src = e.target.result;
        document.getElementById("profile-avatar-preview").dataset.url = e.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById("do-update-profile-btn").addEventListener("click", async () => {
    if (!currentUser) return;
    const newAvatar = document.getElementById("profile-avatar-preview").dataset.url || '';
    const newPass = document.getElementById("prof-new-password").value.trim();
    
    const idx = usersDb.findIndex(u => u.username === currentUser.username);
    if (idx !== -1) {
        if (newAvatar) usersDb[idx].avatar = newAvatar;
        if (newPass) usersDb[idx].password = hashPassword(newPass);
        currentUser = usersDb[idx];
        Storage.set('users', usersDb);
        Storage.set('currentUser', currentUser);
        
        if (supabaseClient) {
            await supabaseClient.from(USERS_TABLE).update({ avatar: currentUser.avatar, password: currentUser.password }).eq('username', currentUser.username).catch(() => {});
        }
    }
    
    document.getElementById("prof-new-password").value = '';
    updateAuthUI();
    Toast.success('Đã cập nhật!');
});

document.getElementById("do-logout-btn").addEventListener("click", () => {
    currentUser = null;
    Storage.remove('currentUser');
    updateAuthUI();
    Toast.info('Đã đăng xuất.');
});

// ----- Keyboard Shortcuts -----
document.addEventListener("keydown", (e) => {
    const flashcardsSection = document.getElementById("flashcards-section");
    if (flashcardsSection.classList.contains("hidden")) return;
    if (document.activeElement.tagName === "INPUT") return;
    
    if (e.key === "ArrowRight") nextBtn.click();
    else if (e.key === "ArrowLeft") prevBtn.click();
    else if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        flashcard.classList.toggle("is-flipped");
    }
});

// ----- Init -----
async function initApp() {
    loadCurrentUser();
    loadData();
    renderDashboard();
    await setupSupabase();
    await syncFromSupabase();
    loadData();
    renderDashboard();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
