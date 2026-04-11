// ----- Data Management -----
let supabaseClient = null;
const SUPABASE_TABLE = "study_sets"; // Tên bảng lưu từ vựng trong CSDL
const USERS_TABLE = "quizlearn_users"; // Table users
let isSupabaseLoaded = false;

async function setupSupabase() {
    if (isSupabaseLoaded) return;
    try {
        const response = await fetch('/api/env');
        const env = await response.json();
        
        if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY && window.supabase) {
            supabaseClient = window.supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
        }
        isSupabaseLoaded = true;
    } catch (e) {
        console.warn("Chưa tải được ENV Supabase hoặc chạy offline.", e);
        isSupabaseLoaded = true; // Mark as done to prevent infinite loops
    }
}

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
async function loadData() {    await setupSupabase();    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from(SUPABASE_TABLE).select('*');
            if (!error && data && data.length > 0) {
                appData = data;
                localStorage.setItem("quizlet_data", JSON.stringify(appData));
            } else {
                migrateInitial();
            }
            
            // Load Users
            const { data: usersData, error: usersErr } = await supabaseClient.from(USERS_TABLE).select('*');
            if (!usersErr && usersData) {
                usersDb = usersData;
                localStorage.setItem("quizlearn_users", JSON.stringify(usersDb));
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
    await setupSupabase();
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
                words: appData[idx].words,
                author: appData[idx].author || null 
            };
            // Upsert (C?p nh?t ho?c Chn m?i)
            await supabaseClient.from(SUPABASE_TABLE).upsert(rowData);
        }
    }
}

// H�m kh?i t?o ri�ng cho t?o Set (k�o th�m Upsert)
async function saveSetToSupabase(newSet) {    await setupSupabase();    if (supabaseClient) {
        await supabaseClient.from(SUPABASE_TABLE).upsert({
            id: newSet.id,
            name: newSet.name,
            words: newSet.words,
            author: newSet.author || null
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

// ----- State -----
let isAuthenticated = false; // Backward compatibility
function checkPassword() {
    if (currentUser) return true; // Accept logged in user
    
    // Nếu chưa có user thì hiển thị thông báo và mở form Đăng nhập
    alert("Vui lòng đăng nhập để thực hiện chức năng này!");
    document.getElementById("auth-panel").classList.add("show");
    return false;
}

// ----- User Auth Management -----
let currentUser = null;
let usersDb = JSON.parse(localStorage.getItem('quizlearn_users')) || [];

function loadCurrentUser() {
    let savedUser = localStorage.getItem('quizlearn_currentUser');
    if(savedUser) {
        currentUser = JSON.parse(savedUser);
    }
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

        // Set edit profile placeholders
        document.getElementById("profile-avatar-preview").src = avatarImg.src;
        document.getElementById("profile-avatar-preview").dataset.avatarUrl = currentUser.avatar || ""; // Khôi phục trạng thái ban đầu
        document.getElementById("prof-avatar-upload").value = ""; // Clear file input
    } else {
        btnText.textContent = "Login";
        iconDisplay.style.display = "inline-block";
        avatarImg.style.display = "none";
        
        loginView.classList.remove("hidden");
        regView.classList.add("hidden");
        profView.classList.add("hidden");
    }
}

// Auth Event Listeners
document.getElementById("auth-toggle-btn").addEventListener("click", () => {
    document.getElementById("auth-panel").classList.toggle("show");
});

// Click outside to close
document.addEventListener("click", (e) => {
    const panel = document.getElementById("auth-panel");
    const dropdown = document.getElementById("auth-user-dropdown");
    if(!dropdown.contains(e.target) && panel.classList.contains("show")) {
        panel.classList.remove("show");
    }
});

// Register
document.getElementById("go-to-register").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("login-form-view").classList.add("hidden");
    document.getElementById("register-form-view").classList.remove("hidden");
});

// Login UI Switch
document.getElementById("go-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("register-form-view").classList.add("hidden");
    document.getElementById("login-form-view").classList.remove("hidden");
});

// Perform Register
document.getElementById("do-register-btn").addEventListener("click", async () => {
    const user = document.getElementById("reg-username").value.trim();
    const disp = document.getElementById("reg-displayname").value.trim();
    const pass = document.getElementById("reg-password").value.trim();

    if(!user || !disp || !pass) return alert("Vui lòng điền đủ thông tin!");
    
    if(usersDb.find(u => u.username === user)) {
        return alert("Username này đã tồn tại!");
    }

    const newUser = { username: user, displayName: disp, password: pass, avatar: "" };
    usersDb.push(newUser);
    localStorage.setItem("quizlearn_users", JSON.stringify(usersDb));
    
    await setupSupabase();
    if(supabaseClient) {
        await supabaseClient.from(USERS_TABLE).insert([{
            username: user,
            displayName: disp,
            password: pass,
            avatar: ""
        }]);
    }

    alert("Đăng ký thành công! Vui lòng đăng nhập.");
    
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-displayname").value = "";
    document.getElementById("reg-password").value = "";
    document.getElementById("go-to-login").click();
});

// Perform Login
document.getElementById("do-login-btn").addEventListener("click", () => {
    const user = document.getElementById("login-username").value.trim();
    const pass = document.getElementById("login-password").value.trim();

    const match = usersDb.find(u => u.username === user && u.password === pass);
    if(!match) {
        return alert("Sai Username hoặc Password!");
    }

    currentUser = match;
    localStorage.setItem("quizlearn_currentUser", JSON.stringify(currentUser));
    
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    document.getElementById("auth-panel").classList.remove("show");
    updateAuthUI();
});

// User Upload Avatar
document.getElementById("prof-avatar-upload").addEventListener("change", function(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    // Convert to Base64 to store and preview
    const reader = new FileReader();
    reader.onload = function(event) {
        const base64Str = event.target.result;
        document.getElementById("profile-avatar-preview").src = base64Str;
        document.getElementById("profile-avatar-preview").dataset.avatarUrl = base64Str; // cache the new Base64 string
    };
    reader.readAsDataURL(file);
});

// Update Profile
document.getElementById("do-update-profile-btn").addEventListener("click", async () => {
    if(!currentUser) return;
    const btn = document.getElementById("do-update-profile-btn");
    const originalText = btn.innerHTML;
    
    const newAvt = document.getElementById("profile-avatar-preview").dataset.avatarUrl || "";
    const newPass = document.getElementById("prof-new-password").value.trim();

    const idx = usersDb.findIndex(u => u.username === currentUser.username);
    if(idx !== -1) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        if(newAvt !== "") usersDb[idx].avatar = newAvt;
        if(newPass !== "") usersDb[idx].password = newPass;

        currentUser = usersDb[idx];
        localStorage.setItem("quizlearn_users", JSON.stringify(usersDb));
        localStorage.setItem("quizlearn_currentUser", JSON.stringify(currentUser));
        
        await setupSupabase();
        if(supabaseClient) {
            try {
                await supabaseClient.from(USERS_TABLE)
                    .update({ avatar: currentUser.avatar, password: currentUser.password })
                    .eq('username', currentUser.username);
            } catch (error) {
                console.error("Lỗi khi update Supabase:", error);
            }
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
        
        document.getElementById("prof-new-password").value = "";
        alert("Cập nhật Profile thành công!");
        updateAuthUI();
    }
});

// Logout
document.getElementById("do-logout-btn").addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("quizlearn_currentUser");
    isAuthenticated = false; // reset admin mode too
    updateAuthUI();
    document.getElementById("auth-panel").classList.remove("show");
});


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
        const targetId = btn.getAttribute("data-target");
        if (!targetId || targetId === "undefined" || targetId === null) return;
        
        navBtns.forEach(b => b.classList.remove("active"));
        sections.forEach(s => s.classList.add("hidden"));
        btn.classList.add("active");
        
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.remove("hidden");
        
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
            if(e.target.closest('.delete-set-btn') || e.target.closest('.edit-set-btn')) return;
            openSet(set.id);
        };
        
        let authorHtml = '';
        if (set.author) {
            let authorName = set.author.displayName || set.author.username;
            let realUser = usersDb.find(u => u.username === set.author.username);
            let authorAvatar = realUser && realUser.avatar 
                ? realUser.avatar 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`;
            
            let dateHtml = "";
            if (set.author.createdAt) {
                let d = new Date(set.author.createdAt);
                dateHtml = `<div style="font-size: 0.75rem; color: #95a5a6; margin-top: 2px; text-align: right;">${d.toLocaleDateString('vi-VN')}</div>`;
            }

            authorHtml = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; float: right;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="${authorAvatar}" alt="Avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">
                        <span style="font-size: 0.9rem; font-weight: bold; color: var(--text-light);">${authorName}</span>
                    </div>
                    ${dateHtml}
                </div>
            `;
        }

        // Show buttons only if admin OR user is the author
        let controlsHtml = '';
        if (isAuthenticated || (currentUser && set.author && set.author.username === currentUser.username)) {
            controlsHtml = `
                <button class="edit-set-btn" onclick="editSet(${set.id})" title="Edit set name" style="margin-right: 10px; border: none; background: none; color: #4255ff; cursor: pointer; font-size: 1.1rem;"><i class="fas fa-edit"></i></button>
                <button class="delete-set-btn" onclick="deleteSet(${set.id})" title="Delete set"><i class="fas fa-trash"></i></button>
            `;
        }

        card.innerHTML = `
            <div style="margin-bottom: 12px;">
                <div class="set-card-title" style="display: inline-block;">${set.name}</div>
                ${authorHtml}
            </div>
            <div>
                <div class="set-card-count" style="display: inline-block;">${set.words.length} terms</div>
            </div>
            <div class="set-card-footer" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                ${controlsHtml}
                <i class="fas fa-chevron-right" style="color: var(--text-light); margin-left: 10px;"></i>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.editSet = async function(id) {
    if (!checkPassword()) return;
    let setObj = appData.find(s => s.id === id);
    if (!setObj) return;

    // Additional check just to be safe
    if (!isAuthenticated && (!currentUser || !setObj.author || setObj.author.username !== currentUser.username)) {
        alert("You do not have permission to edit this set.");
        return;
    }

    let newName = prompt("Enter new name for the set:", setObj.name);
    if (newName && newName.trim() !== "") {
        setObj.name = newName.trim();
        localStorage.setItem("quizlet_data", JSON.stringify(appData));
        renderDashboard();
        
        await setupSupabase();
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            await supabaseClient.from(SUPABASE_TABLE).update({ name: setObj.name }).eq('id', id);
        }
    }
};

document.getElementById("create-set-btn").addEventListener("click", async () => {
    if (!checkPassword()) return;
    let nameInput = document.getElementById("new-set-name");
    let name = nameInput.value.trim();
    if(name) {
        let newSet = { 
            id: Date.now(), 
            name: name, 
            words: [],
            author: currentUser ? {
                username: currentUser.username,
                displayName: currentUser.displayName,
                createdAt: Date.now()
            } : null
        };
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

document.getElementById("generate-set-btn").addEventListener("click", async () => {
    if (!checkPassword()) return;
    let topicInput = document.getElementById("ai-topic-name");
    let countInput = document.getElementById("ai-word-count");
    let topic = topicInput.value.trim();
    let count = parseInt(countInput.value, 10) || 10;
    
    if (!topic) {
        alert("Please enter a topic to auto-generate.");
        return;
    }

    const btn = document.getElementById("generate-set-btn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/generate', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, count })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`HTTP: ${response.status} - ${errData.error || errData.details || ''}`);
        }

        const data = await response.json();
        
        if (data.words && Array.isArray(data.words) && data.words.length > 0) {
            let newSet = { 
                id: Date.now(), 
                name: `Topic: ${topic}`, 
                words: data.words,
                author: currentUser ? {
                    username: currentUser.username,
                    displayName: currentUser.displayName,
                    avatar: currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=random`
                } : null
            };
            appData.unshift(newSet); // Put at the top of the dashboard
            localStorage.setItem("quizlet_data", JSON.stringify(appData));
            
            topicInput.value = "";
            renderDashboard();
            
            // Cập nhật trên Cloud
            if (typeof saveSetToSupabase === 'function') {
                await saveSetToSupabase(newSet);
            }
        } else {
            alert("Không thể tạo danh sách từ vựng. Vui lòng thử lại.");
        }
    } catch (error) {
        console.error("Generate API Error:", error);
        alert(`Lỗi khi tạo topic: ${error.message}`);
    } finally {
        // Render lại UI (trường hợp thay đổi hoặc reset button)
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

window.deleteSet = async function(id) {
    if (!checkPassword()) return;
    if(confirm("Are you sure you want to delete this study set?")) {
        appData = appData.filter(s => s.id !== id);
        localStorage.setItem("quizlet_data", JSON.stringify(appData));
        renderDashboard();
                await setupSupabase();        // ?? C?p nh?t tr�n Cloud
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
    
    const originalText = geminiBtn.innerHTML;
    geminiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang dịch...';
    geminiBtn.disabled = true;
    aiResultBox.classList.remove("hidden");
    aiResultBox.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang suy nghĩ...';

    try {
        // Gọi tới serverless function trên Vercel thay vì lộ key trên FE
        const response = await fetch('/api/translate', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word: word })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Lỗi HTTP: ${response.status} - ${errData.error || errData.details || ''}`);
        }

        const data = await response.json();
        // Groq/Llama sẽ trả text thẳng qua thuộc tính data.text (do thiết lập tại API serverless)
        const meaning = data.text?.trim() || "";
        
        if (meaning) {
            // -- Format AI Result for UI --
            let formattedHtml = "";
            let lines = meaning.split('\n').filter(l => l.trim() !== '');
            
            lines.forEach((line, idx) => {
                // Xử lý dòng Nghĩa đầu tiên (Từ: Nghĩa)
                if (idx === 0 && line.includes(':')) {
                    let parts = line.split(':');
                    let w = parts[0].trim().replace(/^['"*\s]+|['"*\s]+$/g, '');
                    let m = parts.slice(1).join(':').trim().replace(/^['"*\s]+|['"*\s]+$/g, '');
                    if (!m.endsWith('.')) m += '.'; 
                    // Chữ 'm' đã được xóa nháy thừa ở đầu đuôi và gắn thêm chấm nếu chưa có
                    
                    formattedHtml += `<div style="margin-bottom: 12px; font-size: 1.2rem; display: flex; align-items: baseline;">
                        <span style="background: var(--primary-color, #4255ff); color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; margin-right: 8px;">${w}</span>
                        <span style="font-weight: bold; color: #2c3e50;">${m}</span>
                    </div>`;
                    
                } 
                // Xử lý dòng Ví dụ
                else if (line.trim().startsWith('-')) {
                    let content = line.replace(/^-/, '').trim();
                    if (!content.endsWith('.')) content += '.';
                    
                    if (content.includes(':')) {
                        let cParts = content.split(':');
                        formattedHtml += `<div style="margin: 8px 0 8px 15px; padding-left: 12px; border-left: 4px solid #f39c12; color: #34495e; line-height: 1.5;"><strong>${cParts[0].trim()}</strong>: ${cParts.slice(1).join(':').trim()}</div>`;
                    } else {
                        formattedHtml += `<div style="margin: 8px 0 8px 15px; padding-left: 12px; border-left: 4px solid #f39c12; color: #34495e; line-height: 1.5;">${content}</div>`;
                    }
                } 
                // Xử lý dòng Sắc thái (hoặc dòng phụ khác)
                else {
                    let text = line.replace(/\*\*/g, '').trim();
                    if (!text.endsWith('.')) text += '.';
                    formattedHtml += `<div style="margin-top: 12px; font-size: 0.95rem; font-style: italic; color: #7f8c8d; background: #e8ecef; padding: 8px 12px; border-radius: 6px;"><i class="fas fa-info-circle"></i> ${text}</div>`;
                }
            });
            aiResultBox.innerHTML = formattedHtml;

            // Tự động điền vào Input để add từ
            newWordInput.value = word;
            
            // Xử lý tách riêng đoạn nghĩa
            const firstLine = lines[0] || "";
            if (firstLine.includes(':')) {
                // Tách nghĩa sạch nhất có thể
                let rawMeaning = firstLine.split(':')[1].trim().replace(/^['"*\s]+|['"*\s.]+$/g, '').trim();
                newMeaningInput.value = rawMeaning;
            }
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
function isAnswerMatch(userInput, storedAnswer) {
    const inputWords = userInput.toLowerCase().split(',').map(s => s.trim());
    const storedWords = storedAnswer.toLowerCase().split(',').map(s => s.trim());
    // Mảng có phần tử chung? (True nếu user nhập bất kỳ nghĩa nào đúng)
    return inputWords.some(w => storedWords.includes(w));
}

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
    document.querySelectorAll(".meme-feedback").forEach(el => el.remove());
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

// System Meme Storage (Local GIFs for maximum load speed)
const memes = {
    correct: [
        "memes/correct/1.gif",
        "memes/correct/2.gif",
        "memes/correct/3.gif",
        "memes/correct/4.gif",
        "memes/correct/5.gif"
    ],
    incorrect: [
        "memes/incorrect/1.gif",
        "memes/incorrect/2.gif",
        "memes/incorrect/3.gif",
        "memes/incorrect/4.gif",
        "memes/incorrect/5.gif"
    ]
};

function getRandomMeme(isCorrect) {
    const list = isCorrect ? memes.correct : memes.incorrect;
    const url = list[Math.floor(Math.random() * list.length)];
    // Fallback if users add local images to folder: return `memes/${isCorrect ? 'correct' : 'incorrect'}/1.gif` etc.
    return `<img class="meme-feedback" src="${url}" alt="meme feedback" style="max-height: 120px; border-radius: 8px; margin-top: 10px; display: block; margin-left: auto; margin-right: auto; animation: scaleIn 0.3s ease-out;" />`;
}

function checkLearnAnswer(btn, selectedAns, correctAns, type) {
    const isCorrect = isAnswerMatch(selectedAns, correctAns);
    const memeHtml = getRandomMeme(isCorrect);
    
    if(type === "mc") {
        const buttons = learnOptions.querySelectorAll("button");
        buttons.forEach(b => b.disabled = true);
        if (isCorrect) {
            btn.classList.add("correct");
        } else {
            learnErrors++;
            btn.classList.add("incorrect");
            buttons.forEach(b => { if(isAnswerMatch(b.textContent, correctAns)) b.classList.add("correct"); });
            learnQueue.push(currentLearnWord); // return to queue to learn again
        }
        // Thêm Meme vào đầu tuỳ chọn
        learnOptions.insertAdjacentHTML("beforebegin", memeHtml);
    } else {
        learnFeedback.classList.remove("hidden", "correct", "incorrect");
        if (isCorrect) {
            learnFeedback.innerHTML = `Correct! ${memeHtml}`; learnFeedback.classList.add("correct");
        } else {
            learnErrors++;
            learnFeedback.innerHTML = `Incorrect. Answer is: ${correctAns} ${memeHtml}`; learnFeedback.classList.add("incorrect");
            learnQueue.push(currentLearnWord);
        }
    }
    // Kéo dài thời gian hiển thị khi xem Meme
    setTimeout(nextLearnQuestion, isCorrect ? 1500 : 2500);
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
    document.querySelectorAll(".meme-feedback").forEach(el => el.remove());
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
    const isCorrect = isAnswerMatch(selectedAns, correctAns);
    const memeHtml = getRandomMeme(isCorrect);
    
    if(type === "mc") {
        const buttons = testOptions.querySelectorAll("button");
        buttons.forEach(b => b.disabled = true);
        if (isCorrect) {
            testCorrect++; btn.classList.add("correct");
        } else {
            btn.classList.add("incorrect");
            buttons.forEach(b => { if(isAnswerMatch(b.textContent, correctAns)) b.classList.add("correct"); });
        }
        testOptions.insertAdjacentHTML("beforebegin", memeHtml);
    } else {
        testFeedback.classList.remove("hidden", "correct", "incorrect");
        if (isCorrect) {
            testCorrect++; testFeedback.innerHTML = `Correct! ${memeHtml}`; testFeedback.classList.add("correct");
        } else {
            testFeedback.innerHTML = `Incorrect. Answer is: ${correctAns} ${memeHtml}`; testFeedback.classList.add("incorrect");
        }
    }
    setTimeout(nextTestQuestion, isCorrect ? 1500 : 2500);
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
    loadCurrentUser();
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





