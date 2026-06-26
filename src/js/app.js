// ============================================
// QuizLearn - Main Application Entry Point
// ============================================

import Toast from './utils/toast.js';
import StorageManager from './utils/storage.js';
import ApiClient from './utils/api.js';
import AuthModule from './modules/auth.js';
import DashboardModule from './modules/dashboard.js';
import FlashcardModule from './modules/flashcard.js';
import LearnModule from './modules/learn.js';
import TestModule from './modules/test.js';
import NavigationModule from './modules/navigation.js';

class App {
    static supabaseClient = null;
    static isSupabaseLoaded = false;

    static async init() {
        console.log('QuizLearn initializing...');
        
        // Setup error handling
        this.setupGlobalErrorHandling();
        
        // Initialize Supabase
        await this.setupSupabase();
        
        // Initialize modules
        this.initModules();
        
        // Setup navigation
        NavigationModule.init();
        
        // Initial render
        DashboardModule.render();
        
        console.log('QuizLearn initialized successfully!');
    }

    static setupGlobalErrorHandling() {
        // Catch all errors
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.message);
            Toast?.error('Đã xảy ra lỗi: ' + e.message);
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled rejection:', e.reason);
            Toast?.error('Đã xảy ra lỗi không mong đợi');
        });
    }

    static async setupSupabase() {
        if (this.isSupabaseLoaded) return;

        try {
            const env = await ApiClient.getEnv();
            
            if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY && window.supabase) {
                this.supabaseClient = window.supabase.createClient(
                    env.SUPABASE_URL, 
                    env.SUPABASE_ANON_KEY
                );
                console.log('Supabase connected');
            }
        } catch (e) {
            console.warn('Supabase not configured, running in offline mode:', e);
        }
        
        this.isSupabaseLoaded = true;
    }

    static initModules() {
        // Initialize Auth
        AuthModule.init(this.supabaseClient);
        
        // Initialize Dashboard
        DashboardModule.init(this.supabaseClient);
        
        // Initialize Flashcard
        FlashcardModule.init([]);
        
        // Initialize Learn
        LearnModule.init([]);
        
        // Initialize Test
        TestModule.init([]);

        // Setup word change callbacks
        window.onWordAdded = (vocabulary) => {
            DashboardModule.saveCurrentSet(vocabulary);
        };
        
        window.onWordChanged = (vocabulary) => {
            DashboardModule.saveCurrentSet(vocabulary);
        };
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

window.App = App;
export default App;
