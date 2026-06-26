// ============================================
// QuizLearn - Navigation Module
// ============================================

class NavigationModule {
    static init() {
        this.setupNavigation();
        this.setActiveTab('dashboard-section');
    }

    static setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn[data-target]');
        
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                if (!targetId) return;
                
                this.navigateTo(targetId);
            });
        });
    }

    static navigateTo(targetId) {
        const navBtns = document.querySelectorAll('.nav-btn[data-target]');
        const sections = document.querySelectorAll('.app-section');

        // Update nav buttons
        navBtns.forEach(b => {
            if (b.getAttribute('data-target') === targetId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // Update sections
        sections.forEach(s => {
            if (s.id === targetId) {
                s.classList.remove('hidden');
            } else {
                s.classList.add('hidden');
            }
        });

        // Section-specific logic
        switch (targetId) {
            case 'dashboard-section':
                this.handleDashboardSection();
                break;
            case 'flashcards-section':
                this.handleFlashcardsSection();
                break;
            case 'learn-section':
                this.handleLearnSection();
                break;
            case 'test-section':
                this.handleTestSection();
                break;
        }
    }

    static handleDashboardSection() {
        // Hide other tabs
        document.getElementById('tab-flashcards')?.classList.add('hidden');
        document.getElementById('tab-learn')?.classList.add('hidden');
        document.getElementById('tab-test')?.classList.add('hidden');
        
        // Reset current set
        if (window.DashboardModule) {
            window.DashboardModule.currentSetId = null;
            window.DashboardModule.render();
        }
    }

    static handleFlashcardsSection() {
        if (window.FlashcardModule) {
            window.FlashcardModule.updateCard();
            window.FlashcardModule.renderWordList();
        }
    }

    static handleLearnSection() {
        if (window.LearnModule) {
            const cardArea = document.getElementById('learn-card-area');
            const results = document.getElementById('learn-results');
            
            cardArea?.classList.remove('hidden');
            results?.classList.add('hidden');
            window.LearnModule.start();
        }
    }

    static handleTestSection() {
        if (window.TestModule) {
            const cardArea = document.getElementById('test-card-area');
            const results = document.getElementById('test-results');
            
            cardArea?.classList.remove('hidden');
            results?.classList.add('hidden');
            window.TestModule.start();
        }
    }

    static setActiveTab(targetId) {
        const navBtns = document.querySelectorAll('.nav-btn[data-target]');
        const sections = document.querySelectorAll('.app-section');

        navBtns.forEach(b => {
            if (b.getAttribute('data-target') === targetId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        sections.forEach(s => {
            if (s.id === targetId) {
                s.classList.remove('hidden');
            } else {
                s.classList.add('hidden');
            }
        });
    }
}

window.NavigationModule = NavigationModule;
export default NavigationModule;
