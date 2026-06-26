// ============================================
// QuizLearn - Dashboard Module
// ============================================

import Toast from '../utils/toast.js';
import StorageManager from '../utils/storage.js';
import ApiClient from '../utils/api.js';

class DashboardModule {
    static appData = [];
    static currentSetId = null;
    static supabaseClient = null;
    static SUPABASE_TABLE = 'study_sets';

    static init(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.loadData();
        this.setupEventListeners();
    }

    static loadData() {
        // Load from localStorage first
        this.appData = StorageManager.get('data', []);
        
        // Clean data
        this.appData = this.appData.map(set => ({
            id: set.id || Date.now(),
            name: set.name || 'Untitled Set',
            words: Array.isArray(set.words) ? set.words : []
        }));
    }

    static setupEventListeners() {
        // Create set
        document.getElementById('create-set-btn')?.addEventListener('click', () => this.handleCreateSet());

        // Generate set with AI
        document.getElementById('generate-set-btn')?.addEventListener('click', () => this.handleGenerateSet());
    }

    static async syncFromSupabase() {
        if (!this.supabaseClient) return;

        try {
            const { data, error } = await this.supabaseClient.from(this.SUPABASE_TABLE).select('*');
            
            if (!error && data && data.length > 0) {
                this.appData = data;
                StorageManager.set('data', this.appData);
            }
            
            // Load users
            const { data: usersData } = await this.supabaseClient.from('quizlearn_users').select('*');
            if (usersData) {
                StorageManager.set('users', usersData);
            }
        } catch (e) {
            console.warn('Supabase sync failed:', e);
        }
    }

    static render() {
        const grid = document.getElementById('set-grid');
        grid.innerHTML = '';

        this.appData.forEach(set => {
            const card = this.createSetCard(set);
            grid.appendChild(card);
        });
    }

    static createSetCard(set) {
        const card = document.createElement('div');
        card.className = 'set-card';
        
        // Author info
        let authorHtml = '';
        if (set.author) {
            const authorName = set.author.displayName || set.author.username;
            const usersDb = StorageManager.get('users', []);
            const realUser = usersDb.find(u => u.username === set.author.username);
            const authorAvatar = realUser?.avatar || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`;
            
            let dateHtml = '';
            if (set.author.createdAt) {
                const d = new Date(set.author.createdAt);
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

        // Controls
        let controlsHtml = '';
        const currentUser = window.AuthModule?.currentUser;
        const canEdit = currentUser && (!set.author || set.author.username === currentUser.username);
        
        if (canEdit) {
            controlsHtml = `
                <button class="edit-set-btn" data-id="${set.id}" title="Edit set name" style="margin-right: 10px; border: none; background: none; color: #4255ff; cursor: pointer; font-size: 1.1rem;"><i class="fas fa-edit"></i></button>
                <button class="delete-set-btn" data-id="${set.id}" title="Delete set"><i class="fas fa-trash"></i></button>
            `;
        }

        card.innerHTML = `
            <div style="margin-bottom: 12px;">
                <div class="set-card-title" style="display: inline-block;">${set.name}</div>
                ${authorHtml}
            </div>
            <div>
                <div class="set-card-count" style="display: inline-block;">${set.words?.length || 0} terms</div>
            </div>
            <div class="set-card-footer" style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                ${controlsHtml}
                <i class="fas fa-chevron-right" style="color: var(--text-light); margin-left: 10px;"></i>
            </div>
        `;

        // Click to open
        card.addEventListener('click', (e) => {
            if (e.target.closest('.delete-set-btn') || e.target.closest('.edit-set-btn')) return;
            this.openSet(set.id);
        });

        // Edit button
        card.querySelector('.edit-set-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editSet(set.id);
        });

        // Delete button
        card.querySelector('.delete-set-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteSet(set.id);
        });

        return card;
    }

    static async handleCreateSet() {
        if (!window.AuthModule?.isAuthenticated()) {
            Toast.warning('Vui lòng đăng nhập để tạo set!');
            document.getElementById('auth-panel')?.classList.add('show');
            return;
        }

        const nameInput = document.getElementById('new-set-name');
        const name = nameInput?.value.trim();

        if (!name) {
            return Toast.error('Vui lòng nhập tên cho set mới!');
        }

        const currentUser = window.AuthModule.currentUser;
        const newSet = {
            id: Date.now(),
            name,
            words: [],
            author: currentUser ? {
                username: currentUser.username,
                displayName: currentUser.displayName,
                createdAt: Date.now()
            } : null
        };

        this.appData.push(newSet);
        StorageManager.set('data', this.appData);
        nameInput.value = '';
        
        this.render();

        // Sync to Supabase
        if (this.supabaseClient) {
            try {
                await this.supabaseClient.from(this.SUPABASE_TABLE).upsert(newSet);
            } catch (e) {
                console.warn('Supabase sync failed:', e);
            }
        }

        Toast.success(`Đã tạo set "${name}"!`);
    }

    static async handleGenerateSet() {
        if (!window.AuthModule?.isAuthenticated()) {
            Toast.warning('Vui lòng đăng nhập để tạo set!');
            document.getElementById('auth-panel')?.classList.add('show');
            return;
        }

        const topicInput = document.getElementById('ai-topic-name');
        const countInput = document.getElementById('ai-word-count');
        const topic = topicInput?.value.trim();
        const count = parseInt(countInput?.value, 10) || 10;

        if (!topic) {
            return Toast.error('Vui lòng nhập chủ đề để tạo set!');
        }

        const btn = document.getElementById('generate-set-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...';
        btn.disabled = true;

        try {
            const data = await ApiClient.generateWords(topic, count);
            
            if (data.words && Array.isArray(data.words) && data.words.length > 0) {
                const currentUser = window.AuthModule.currentUser;
                const newSet = {
                    id: Date.now(),
                    name: `Topic: ${topic}`,
                    words: data.words,
                    author: currentUser ? {
                        username: currentUser.username,
                        displayName: currentUser.displayName,
                        avatar: currentUser.avatar
                    } : null
                };

                this.appData.unshift(newSet);
                StorageManager.set('data', this.appData);
                topicInput.value = '';
                
                this.render();

                // Sync to Supabase
                if (this.supabaseClient) {
                    try {
                        await this.supabaseClient.from(this.SUPABASE_TABLE).upsert(newSet);
                    } catch (e) {
                        console.warn('Supabase sync failed:', e);
                    }
                }

                Toast.success(`Đã tạo ${data.words.length} từ vựng về "${topic}"!`);
            } else {
                Toast.error('Không thể tạo danh sách từ vựng. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Generate API Error:', error);
            Toast.error(`Lỗi khi tạo topic: ${error.message}`);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    static async editSet(id) {
        if (!window.AuthModule?.isAuthenticated()) {
            Toast.warning('Vui lòng đăng nhập!');
            return;
        }

        const setObj = this.appData.find(s => s.id === id);
        if (!setObj) return;

        const currentUser = window.AuthModule.currentUser;
        if (setObj.author && setObj.author.username !== currentUser.username) {
            return Toast.error('Bạn không có quyền chỉnh sửa set này!');
        }

        const newName = prompt('Nhập tên mới cho set:', setObj.name);
        if (newName && newName.trim()) {
            setObj.name = newName.trim();
            StorageManager.set('data', this.appData);
            this.render();

            if (this.supabaseClient) {
                try {
                    await this.supabaseClient.from(this.SUPABASE_TABLE).update({ name: setObj.name }).eq('id', id);
                } catch (e) {
                    console.warn('Supabase sync failed:', e);
                }
            }

            Toast.success('Đã cập nhật tên set!');
        }
    }

    static async deleteSet(id) {
        if (!window.AuthModule?.isAuthenticated()) {
            Toast.warning('Vui lòng đăng nhập!');
            return;
        }

        const setObj = this.appData.find(s => s.id === id);
        if (!setObj) return;

        const currentUser = window.AuthModule.currentUser;
        if (setObj.author && setObj.author.username !== currentUser.username) {
            return Toast.error('Bạn không có quyền xóa set này!');
        }

        if (confirm(`Xóa set "${setObj.name}"?`)) {
            this.appData = this.appData.filter(s => s.id !== id);
            StorageManager.set('data', this.appData);
            this.render();

            if (this.supabaseClient) {
                try {
                    await this.supabaseClient.from(this.SUPABASE_TABLE).delete().eq('id', id);
                } catch (e) {
                    console.warn('Supabase sync failed:', e);
                }
            }

            Toast.success('Đã xóa set!');
        }
    }

    static openSet(id) {
        this.currentSetId = id;
        const setObj = this.appData.find(s => s.id === id);
        if (!setObj) return;

        // Update headers
        document.getElementById('current-set-title-display').textContent = setObj.name;
        document.getElementById('learn-set-title-display').textContent = setObj.name + ' - Learn Mode';
        document.getElementById('test-set-title-display').textContent = setObj.name + ' - Test Mode';
        
        // Show tabs
        document.getElementById('tab-flashcards')?.classList.remove('hidden');
        document.getElementById('tab-learn')?.classList.remove('hidden');
        document.getElementById('tab-test')?.classList.remove('hidden');

        // Update modules
        if (window.FlashcardModule) {
            window.FlashcardModule.setVocabulary(setObj.words || []);
        }
        if (window.LearnModule) {
            window.LearnModule.setVocabulary(setObj.words || []);
        }
        if (window.TestModule) {
            window.TestModule.setVocabulary(setObj.words || []);
        }

        // Navigate to flashcards
        document.getElementById('tab-flashcards')?.click();
    }

    static saveCurrentSet(vocabulary) {
        if (!this.currentSetId) return;

        const idx = this.appData.findIndex(s => s.id === this.currentSetId);
        if (idx > -1) {
            this.appData[idx].words = vocabulary;
            StorageManager.set('data', this.appData);

            if (this.supabaseClient) {
                const rowData = {
                    id: this.appData[idx].id,
                    name: this.appData[idx].name,
                    words: vocabulary,
                    author: this.appData[idx].author
                };
                this.supabaseClient.from(this.SUPABASE_TABLE).upsert(rowData).catch(e => {
                    console.warn('Supabase sync failed:', e);
                });
            }
        }
    }

    static getSetById(id) {
        return this.appData.find(s => s.id === id);
    }
}

window.DashboardModule = DashboardModule;
export default DashboardModule;
