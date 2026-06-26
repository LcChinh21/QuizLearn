// ============================================
// QuizLearn - Storage Manager
// ============================================

class StorageManager {
    static PREFIX = 'quizlearn_';
    
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.PREFIX + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(this.PREFIX + key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    }

    static clear() {
        try {
            Object.keys(localStorage)
                .filter(key => key.startsWith(this.PREFIX))
                .forEach(key => localStorage.removeItem(key));
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
}

window.StorageManager = StorageManager;
export default StorageManager;
