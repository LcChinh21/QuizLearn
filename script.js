// ----- Data Management -----
// ?? BU?C 1: �I?N TH�NG TIN SUPABASE C?A B?N V�O ��Y
const SUPABASE_URL = "https://zeahkcbhtklsoxmtwodx.supabase.co"; // <-- �i?n Project URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplYWhrY2JodGtsc294bXR3b2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzU3MDUsImV4cCI6MjA5MTMxMTcwNX0.Uueo73E-trMVtj2UkwK0OafB2xjtk-AOvzVSRiwP0Ro"; // <-- �i?n API Anon Key
const SUPABASE_TABLE = "study_sets"; // T�n b?ng luu t? v?ng trong CSDL

// Kh?i t?o Supabase client (n?u c� nh�ng web SDK) n797
const supabaseClient = window.supabase && SUPABASE_URL.includes("supabase.co") ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let appData = [];
try {
    let localData = localStorage.getItem("quizlet_data");
    if (localData) appData = JSON.parse(localData);
} catch (e) {
    console.warn("Lỗi đọc LocalStorage", e);
}
if (!Array.isArray(appData)) { appData = []; }
// Làm sạch dữ liệu từ LocalStorage để chống lỗi "set.words is undefined"
appData = appData.map(set => ({
    id: set.id || Date.now(),
    name: set.name || "Untitled Set",
    words: Array.isArray(set.words) ? set.words : []
}));

let currentSetId = null;
let vocabulary = []; // Points to current set's words array

// ?? �?ng b? d? li?u (Load Data)
async function loadData() {
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from(SUPABASE_TABLE).select('*');
            if (!error && data && data.length > 0) {
                appData = data;
                localStorage.setItem("quizlet_data", JSON.stringify(appData));
            } else {
                migrateInitial();
            }
        } catch (e) {
            console.warn("Không thể tải Supabase, dùng LocalStorage.", e);
            migrateInitial();
        }
    } else {
        migrateInitial();
    }
}

function migrateInitial() {
    if (!appData || appData.length === 0) {
        appData = [{ id: Date.now(), name: "Lỗi: Không kết nối máy chủ", words: [] }];
        let defaultSet = [
            { word: "Database", meaning: "Cơ sở dữ liệu" },
            { word: "Authentication", meaning: "Xác thực" }
        ];
        appData[0].words = defaultSet;
        localStorage.setItem("quizlet_data", JSON.stringify(appData));
    }
}

// ?? Luu d? li?u (Save Data)
async function saveData() {
    if(!currentSetId) return;
    let idx = appData.findIndex(s => s.id === currentSetId);
    if (idx > -1) {
        appData[idx].words = vocabulary;
        
        // 1. Luu trên thiết bị (Offline hỏa tốc)
        localStorage.setItem("quizlet_data", JSON.stringify(appData));

        // 2. Gửi lên Supabase (Đám mây)
        if (supabaseClient) {
            const rowData = { 
                id: appData[idx].id, 
                name: appData[idx].name, 
                words: appData[idx].words 
            };
            // Upsert (C?p nh?t ho?c Chn m?i)
            await supabaseClient.from(SUPABASE_TABLE).upsert(rowData);
        }
    }
}

// H�m kh?i t?o ri�ng cho t?o Set (k�o th�m Upsert)
async function saveSetToSupabase(newSet) {
    if (supabaseClient) {
        await supabaseClient.from(SUPABASE_TABLE).upsert({
            id: newSet.id,
            name: newSet.name,
            words: newSet.words
        });
    }
}
// ----- DOM Elements -----
const navBtns = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".app-section");

const tabDashboard = document.getElementById("tab-dashboard");
const tabFlashcards = document.getElementById("tab-flashcards");
const tabLearn = document.getElementById("tab-learn");
const tabTest = document.getElementById("tab-test");

// Flashcards
const flashcard = document.getElementById("flashcard");
const cardFront = document.getElementById("card-front");
const cardBack = document.getElementById("card-back");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const cardCounter = document.getElementById("card-counter");
const wordListContainer = document.getElementById("word-list-container");
const totalWordsCount = document.getElementById("total-words-count");
const newWordInput = document.getElementById("new-word");
const newMeaningInput = document.getElementById("new-meaning");
const addWordBtn = document.getElementById("add-word-btn");

// AI Elements
const geminiBtn = document.getElementById("gemini-btn");
const aiLookupInput = document.getElementById("ai-lookup-input");
const aiResultBox = document.getElementById("ai-result-box");

// Learn Elements
const learnQuestion = document.getElementById("learn-question");
const learnOptions = document.getElementById("learn-options");
const learnProgress = document.getElementById("learn-progress");
const learnRestartBtn = document.getElementById("learn-restart");
const learnSettingsBtn = document.getElementById("learn-settings-btn");
const learnSettingsPanel = document.getElementById("learn-settings-panel");
const saveLearnSettingsBtn = document.getElementById("save-learn-settings");
const settingMc = document.getElementById("setting-mc");
const settingWritten = document.getElementById("setting-written");
const settingDirection = document.getElementById("setting-direction");
const learnWrittenArea = document.getElementById("learn-written");
const learnAnswerInput = document.getElementById("learn-answer-input");
const learnFeedback = document.getElementById("learn-feedback");
const learnSubmitBtn = document.getElementById("learn-submit-btn");
const learnCardArea = document.getElementById("learn-card-area");
const learnResults = document.getElementById("learn-results");
const learnResultDetails = document.getElementById("learn-result-details");

// Test Elements
const testQuestion = document.getElementById("test-question");
const testOptions = document.getElementById("test-options");
const testProgress = document.getElementById("test-progress");
const testRestartBtn = document.getElementById("test-restart");
const testSettingsBtn = document.getElementById("test-settings-btn");
const testSettingsPanel = document.getElementById("test-settings-panel");
const saveTestSettingsBtn = document.getElementById("save-test-settings");
const testSettingMc = document.getElementById("test-setting-mc");
const testSettingWritten = document.getElementById("test-setting-written");
const testSettingDirection = document.getElementById("test-setting-direction");
const testWrittenArea = document.getElementById("test-written");
const testAnswerInput = document.getElementById("test-answer-input");
const testFeedback = document.getElementById("test-feedback");
const testSubmitBtn = document.getElementById("test-submit-btn");
const testCardArea = document.getElementById("test-card-area");
const testResults = document.getElementById("test-results");
const testScoreText = document.getElementById("test-score-text");
const testResultDetails = document.getElementById("test-result-details");

// State
let isAuthenticated = false;
function checkPassword() {
    if (isAuthenticated) return true;
    const pwd = prompt("Vui lòng nhập mật khẩu để tiếp tục thao tác:");
    if (pwd === "ChinhLeCute") {
        isAuthenticated = true;
        return true;
    }
    if (pwd !== null) alert("Mật khẩu không chính xác!");
    return false;
}

let flashcardIndex = 0;
let learnQueue = [];
let testQueue = [];
let currentLearnWord = null;
let currentTestWord = null;
let currentLearnDirection = "en";
let currentTestDirection = "en";

// Stats
let learnErrors = 0;
let testCorrect = 0;
let testTotal = 0;

// ----- Navigation -----
navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        navBtns.forEach(b => b.classList.remove("active"));
        sections.forEach(s => s.classList.add("hidden"));
        btn.classList.add("active");
        const targetId = btn.getAttribute("data-target");
        document.getElementById(targetId).classList.remove("hidden");
        
        if(targetId === "dashboard-section") {
            renderDashboard();
            tabFlashcards.classList.add("hidden");
            tabLearn.classList.add("hidden");
            tabTest.classList.add("hidden");
            currentSetId = null;
        }
        else if(targetId === "flashcards-section") initFlashcards();
        else if(targetId === "learn-section") {
            learnCardArea.classList.remove("hidden");
            learnResults.classList.add("hidden");
            startLearnMode();
        }
        else if(targetId === "test-section") {
            testCardArea.classList.remove("hidden");
            testResults.classList.add("hidden");
            startTestMode();
        }
    });
});

// ----- Dashboard Mode -----
function renderDashboard() {
    let grid = document.getElementById("set-grid");
    grid.innerHTML = "";
    appData.forEach(set => {
        let card = document.createElement("div");
        card.className = "set-card";
        card.onclick = (e) => {
            if(e.target.closest('.delete-set-btn')) return;
            openSet(set.id);
        };
        card.innerHTML = `
            <div>
                <div class="set-card-title">${set.name}</div>
                <div class="set-card-count">${set.words.length} terms</div>
            </div>
            <div class="set-card-footer">
                <button class="delete-set-btn" onclick="deleteSet(${set.id})" title="Delete set"><i class="fas fa-trash"></i></button>
                <i class="fas fa-chevron-right" style="color: var(--text-light);"></i>
            </div>
        `;
        grid.appendChild(card);
    });
}

document.getElementById("create-set-btn").addEventListener("click", async () => {
    if (!checkPassword()) return;
    let nameInput = document.getElementById("new-set-name");
    let name = nameInput.value.trim();
    if(name) {
        let newSet = { id: Date.now(), name: name, words: [] };
        appData.push(newSet);
        localStorage.setItem("quizlet_data", JSON.stringify(appData));
        nameInput.value = "";
        renderDashboard();
        
        // ?? C?p nh?t tr�n Cloud
        if (typeof saveSetToSupabase === 'function') {
            await saveSetToSupabase(newSet);
        }
    } else {
        alert("Please enter a name for the new set.");
    }
});

window.deleteSet = async function(id) {
    if (!checkPassword()) return;
    if(confirm("Are you sure you want to delete this study set?")) {
        appData = appData.filter(s => s.id !== id);
        localStorage.setItem("quizlet_data", JSON.stringify(appData));
        renderDashboard();
        
        // ?? C?p nh?t tr�n Cloud
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from(SUPABASE_TABLE).delete().eq('id', id);
        }
    }
};

function openSet(id) {
    currentSetId = id;
    let setObj = appData.find(s => s.id === id);
    if (!setObj) return;
    vocabulary = setObj.words || [];
    
    // Set headers
    document.getElementById("current-set-title-display").textContent = setObj.name;
    document.getElementById("learn-set-title-display").textContent = setObj.name + " - Learn Mode";
    document.getElementById("test-set-title-display").textContent = setObj.name + " - Test Mode";
    
    // Show tabs
    tabFlashcards.classList.remove("hidden");
    tabLearn.classList.remove("hidden");
    tabTest.classList.remove("hidden");
    
    // Go to flashcards
    tabFlashcards.click();
}


// ----- Flashcard Mode -----
function initFlashcards() {
    if (vocabulary.length === 0) {
        cardFront.textContent = "No words";
        cardBack.textContent = "Please add words first";
        cardCounter.textContent = "0 / 0";
    } else {
        if(flashcardIndex >= vocabulary.length) flashcardIndex = 0;
        updateCard();
    }
    renderWordList();
}
function updateCard() {
    if(vocabulary.length === 0) return;
    const currentWord = vocabulary[flashcardIndex];
    cardFront.textContent = currentWord.word;
    cardBack.textContent = currentWord.meaning;
    cardCounter.textContent = `${flashcardIndex + 1} / ${vocabulary.length}`;
    flashcard.classList.remove("is-flipped");
}
flashcard.addEventListener("click", () => {
    if(vocabulary.length > 0) flashcard.classList.toggle("is-flipped");
});
prevBtn.addEventListener("click", () => { if (flashcardIndex > 0) { flashcardIndex--; updateCard(); } });
nextBtn.addEventListener("click", () => { if (flashcardIndex < vocabulary.length - 1) { flashcardIndex++; updateCard(); } });

// ----- Add Word & List -----
geminiBtn.addEventListener("click", async () => {
    const word = aiLookupInput.value.trim();
    if (!word) {
        alert("Vui lòng nhập từ tiếng Anh để AI dịch nghĩa!");
        return;
    }
    
    let apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
        apiKey = prompt("Vui lòng nhập Gemini API Key của bạn (Key sẽ được lưu trữ an toàn trong trình duyệt cục bộ):");
        if (!apiKey) return;
        localStorage.setItem("gemini_api_key", apiKey);
    }

    const originalText = geminiBtn.innerHTML;
    geminiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang dịch...';
    geminiBtn.disabled = true;
    aiResultBox.classList.remove("hidden");
    aiResultBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang suy nghĩ...';

    try {
        const promptText = `Bạn là người phiên dịch các từ tiếng Anh sang tiếng Việt. Mục tiêu và nhiệm vụ:
- Dịch chính xác từ tiếng Anh sang tiếng Việt, chỉ rõ từ gốc nếu cần.
- Đưa ra 2-3 ví dụ ngắn gọn, dễ hiểu về cách sử dụng.
- Giải thích ngắn gọn sắc thái (trang trọng, lóng,...).
Quy tắc:
1. Định dạng đúng: '${word}' : 'Nghĩa tiếng Việt'.
2. List ví dụ bằng gạch đầu dòng cực kỳ ngắn gọn.
3. Không giải thích dài dòng hàn lâm.
Từ cần dịch: "${word}"`;

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        if (!response.ok) {
            if (response.status === 400 || response.status === 403) {
                localStorage.removeItem("gemini_api_key");
                throw new Error("API Key không hợp lệ hoặc hết hạn.");
            }
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }

        const data = await response.json();
        const meaning = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (meaning) {
            aiResultBox.innerHTML = meaning;
            // Optionally auto-fill the add word form for convenience:
            newWordInput.value = word;
            // Extract just the translation part roughly for the meaning input
            const firstLine = meaning.split('\n')[0];
            const meaningPart = firstLine.split(':')[1]?.trim().replace(/'$/, '') || "";
            if(meaningPart) newMeaningInput.value = meaningPart;
        } else {
            aiResultBox.innerHTML = "Không tìm thấy nghĩa của từ này.";
        }
    } catch (error) {
        console.error("Gemini API Error:", error);
        aiResultBox.innerHTML = `<span style="color: red;">Lỗi khi dịch: ${error.message}</span>`;
    } finally {
        geminiBtn.innerHTML = originalText;
        geminiBtn.disabled = false;
    }
});

addWordBtn.addEventListener("click", () => {
    if (!checkPassword()) return;
    const word = newWordInput.value.trim();
    const meaning = newMeaningInput.value.trim();
    if (word && meaning) {
        vocabulary.push({ word, meaning });
        saveData();
        newWordInput.value = ""; newMeaningInput.value = "";
        initFlashcards();
    }
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
    if (!checkPassword()) return;
    vocabulary.splice(index, 1); 
    saveData(); 
    initFlashcards(); 
};

// ----- General Question Generator Helper -----
function getQuestionData(wordObj, dirPref) {
    let direction = dirPref;
    if (direction === "random") direction = Math.random() > 0.5 ? "en" : "vi";
    return {
        direction: direction,
        question: direction === "en" ? wordObj.meaning : wordObj.word,
        answer: direction === "en" ? wordObj.word : wordObj.meaning
    };
}
function generateOptions(correctAnswer, direction) {
    let options = [correctAnswer];
    let otherWords = [...vocabulary].filter(v => (direction === "en" ? v.word : v.meaning) !== correctAnswer).sort(() => Math.random() - 0.5);
    for(let i=0; i<3 && i<otherWords.length; i++){
        options.push(direction === "en" ? otherWords[i].word : otherWords[i].meaning);
    }
    return options.sort(() => Math.random() - 0.5);
}


// ----- Learn Mode -----
learnSettingsBtn.addEventListener("click", () => learnSettingsPanel.classList.toggle("hidden"));
saveLearnSettingsBtn.addEventListener("click", () => {
    if (!settingMc.checked && !settingWritten.checked) settingMc.checked = true;
    learnSettingsPanel.classList.add("hidden");
    startLearnMode();
});

function startLearnMode() {
    if(vocabulary.length === 0) {
        alert("Please add words to your set to start learning!");
        return;
    }
    learnQueue = [...vocabulary].sort(() => Math.random() - 0.5);
    learnRestartBtn.classList.add("hidden");
    learnCardArea.classList.remove("hidden");
    learnResults.classList.add("hidden");
    learnErrors = 0;
    nextLearnQuestion();
}

function nextLearnQuestion() {
    if (learnQueue.length === 0) {
        learnCardArea.classList.add("hidden");
        learnResults.classList.remove("hidden");
        learnResultDetails.textContent = `You've mastered ${vocabulary.length} words with only ${learnErrors} mistakes!`;
        learnRestartBtn.classList.remove("hidden");
        return;
    }
    currentLearnWord = learnQueue.shift(); // take from front
    learnProgress.textContent = `${vocabulary.length - learnQueue.length} / ${vocabulary.length}`;

    let qData = getQuestionData(currentLearnWord, settingDirection.value || "en");
    currentLearnDirection = qData.direction;

    let useWritten = false;
    if (settingMc.checked && settingWritten.checked) useWritten = Math.random() > 0.5;
    else if (settingWritten.checked) useWritten = true;

    learnQuestion.textContent = qData.question;
    if (useWritten) {
        learnOptions.classList.add("hidden"); learnWrittenArea.classList.remove("hidden");
        learnAnswerInput.value = ""; learnFeedback.classList.add("hidden"); learnAnswerInput.focus();
    } else {
        learnWrittenArea.classList.add("hidden"); learnOptions.classList.remove("hidden");
        let opts = generateOptions(qData.answer, currentLearnDirection);
        learnOptions.innerHTML = "";
        opts.forEach(opt => {
            const btn = document.createElement("button"); btn.className = "option-btn"; btn.textContent = opt;
            btn.onclick = () => checkLearnAnswer(btn, opt, qData.answer, "mc");
            learnOptions.appendChild(btn);
        });
    }
}

function checkLearnAnswer(btn, selectedAns, correctAns, type) {
    let isCorrect = (selectedAns.toLowerCase() === correctAns.toLowerCase());
    
    if(type === "mc") {
        const buttons = learnOptions.querySelectorAll("button");
        buttons.forEach(b => b.disabled = true);
        if (isCorrect) {
            btn.classList.add("correct");
        } else {
            learnErrors++;
            btn.classList.add("incorrect");
            buttons.forEach(b => { if(b.textContent.toLowerCase() === correctAns.toLowerCase()) b.classList.add("correct"); });
            learnQueue.push(currentLearnWord); // return to queue to learn again
        }
    } else {
        learnFeedback.classList.remove("hidden", "correct", "incorrect");
        if (isCorrect) {
            learnFeedback.textContent = "Correct!"; learnFeedback.classList.add("correct");
        } else {
            learnErrors++;
            learnFeedback.textContent = `Incorrect. Answer is: ${correctAns}`; learnFeedback.classList.add("incorrect");
            learnQueue.push(currentLearnWord);
        }
    }
    setTimeout(nextLearnQuestion, isCorrect ? 1000 : 2000);
}

learnSubmitBtn.addEventListener("click", () => {
    let qData = getQuestionData(currentLearnWord, currentLearnDirection);
    checkLearnAnswer(null, learnAnswerInput.value.trim(), qData.answer, "written");
});
learnAnswerInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter") learnSubmitBtn.click();
});
learnRestartBtn.addEventListener("click", startLearnMode);


// ----- Test Mode -----
testSettingsBtn.addEventListener("click", () => testSettingsPanel.classList.toggle("hidden"));
saveTestSettingsBtn.addEventListener("click", () => {
    if (!testSettingMc.checked && !testSettingWritten.checked) testSettingMc.checked = true;
    testSettingsPanel.classList.add("hidden");
    startTestMode();
});

function startTestMode() {
    if(vocabulary.length === 0) {
        alert("Please add words to test yourself!");
        return;
    }
    testQueue = [...vocabulary].sort(() => Math.random() - 0.5);
    testTotal = vocabulary.length; testCorrect = 0;
    testRestartBtn.classList.add("hidden");
    testCardArea.classList.remove("hidden");
    testResults.classList.add("hidden");
    nextTestQuestion();
}

function nextTestQuestion() {
    if (testQueue.length === 0) {
        testCardArea.classList.add("hidden");
        testResults.classList.remove("hidden");
        let pct = Math.round((testCorrect / testTotal) * 100) || 0;
        testScoreText.textContent = `${pct}%`;
        testScoreText.style.backgroundColor = pct >= 80 ? 'var(--success-color)' : (pct >= 50 ? 'orange' : 'var(--error-color)');
        testResultDetails.textContent = `Correct: ${testCorrect} | Incorrect: ${testTotal - testCorrect}`;
        testRestartBtn.classList.remove("hidden");
        return;
    }
    currentTestWord = testQueue.pop(); // linear pop, no queue returns
    testProgress.textContent = `${testTotal - testQueue.length} / ${testTotal}`;

    let qData = getQuestionData(currentTestWord, testSettingDirection.value || "en");
    currentTestDirection = qData.direction;

    let useWritten = false;
    if (testSettingMc.checked && testSettingWritten.checked) useWritten = Math.random() > 0.5;
    else if (testSettingWritten.checked) useWritten = true;

    testQuestion.textContent = qData.question;
    if (useWritten) {
        testOptions.classList.add("hidden"); testWrittenArea.classList.remove("hidden");
        testAnswerInput.value = ""; testFeedback.classList.add("hidden"); testAnswerInput.focus();
    } else {
        testWrittenArea.classList.add("hidden"); testOptions.classList.remove("hidden");
        let opts = generateOptions(qData.answer, currentTestDirection);
        testOptions.innerHTML = "";
        opts.forEach(opt => {
            const btn = document.createElement("button"); btn.className = "option-btn"; btn.textContent = opt;
            btn.onclick = () => checkTestAnswer(btn, opt, qData.answer, "mc");
            testOptions.appendChild(btn);
        });
    }
}

function checkTestAnswer(btn, selectedAns, correctAns, type) {
    let isCorrect = (selectedAns.toLowerCase() === correctAns.toLowerCase());
    
    if(type === "mc") {
        const buttons = testOptions.querySelectorAll("button");
        buttons.forEach(b => b.disabled = true);
        if (isCorrect) {
            testCorrect++; btn.classList.add("correct");
        } else {
            btn.classList.add("incorrect");
            buttons.forEach(b => { if(b.textContent.toLowerCase() === correctAns.toLowerCase()) b.classList.add("correct"); });
        }
    } else {
        testFeedback.classList.remove("hidden", "correct", "incorrect");
        if (isCorrect) {
            testCorrect++; testFeedback.textContent = "Correct!"; testFeedback.classList.add("correct");
        } else {
            testFeedback.textContent = `Incorrect. Answer is: ${correctAns}`; testFeedback.classList.add("incorrect");
        }
    }
    setTimeout(nextTestQuestion, isCorrect ? 1000 : 2500);
}

testSubmitBtn.addEventListener("click", () => {
    let qData = getQuestionData(currentTestWord, currentTestDirection);
    checkTestAnswer(null, testAnswerInput.value.trim(), qData.answer, "written");
});
testAnswerInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter") testSubmitBtn.click();
});
testRestartBtn.addEventListener("click", startTestMode);

// Event for keyboard shortcuts in Flashcard mode
document.addEventListener("keydown", (e) => {
    if(document.activeElement.tagName === "INPUT" || document.getElementById("flashcards-section").classList.contains("hidden")) return;
    if (e.key === "ArrowRight") nextBtn.click();
    else if (e.key === "ArrowLeft") prevBtn.click();
    else if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault(); flashcard.classList.toggle("is-flipped");
    }
});

// Init (Start at Dashboard)
function initApp() {
    try {
        renderDashboard();
        if(tabDashboard) tabDashboard.click();
    } catch (e) {
        console.error("Error setting up UI:", e);
    }
    
    // Background data sync
    loadData().then(() => {
        try {
            renderDashboard();
        } catch(e) {}
    }).catch(e => {
        console.error("Init Data Error:", e);
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}





