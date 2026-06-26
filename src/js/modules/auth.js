// ============================================
// QuizLearn - Authentication Module
// ============================================

import Toast from '../utils/toast.js';
import StorageManager from '../utils/storage.js';
import ApiClient from '../utils/api.js';

class AuthModule {
    static currentUser = null;
    static usersDb = [];
    static supabaseClient = null;

    static init(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.loadCurrentUser();
        this.setupEventListeners();
    }

    static loadCurrentUser() {
        const savedUser = StorageManager.get('currentUser');
        if (savedUser) {
            this.currentUser = savedUser;
        }
        this.usersDb = StorageManager.get('users', []);
        this.updateAuthUI();
    }

    static setupEventListeners() {
        // Toggle auth panel
        const toggleBtn = document.getElementById('auth-toggle-btn');
        const panel = document.getElementById('auth-panel');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                panel?.classList.toggle('show');
            });
        }

        // Click outside to close
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('auth-user-dropdown');
            if (dropdown && !dropdown.contains(e.target) && panel?.classList.contains('show')) {
                panel.classList.remove('show');
            }
        });

        // Switch between login/register
        document.getElementById('go-to-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form-view')?.classList.add('hidden');
            document.getElementById('register-form-view')?.classList.remove('hidden');
        });

        document.getElementById('go-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form-view')?.classList.add('hidden');
            document.getElementById('login-form-view')?.classList.remove('hidden');
        });

        // Register
        document.getElementById('do-register-btn')?.addEventListener('click', () => this.handleRegister());

        // Login
        document.getElementById('do-login-btn')?.addEventListener('click', () => this.handleLogin());

        // Update profile
        document.getElementById('do-update-profile-btn')?.addEventListener('click', () => this.handleUpdateProfile());

        // Avatar upload
        document.getElementById('prof-avatar-upload')?.addEventListener('change', (e) => this.handleAvatarUpload(e));

        // Logout
        document.getElementById('do-logout-btn')?.addEventListener('click', () => this.handleLogout());
    }

    static updateAuthUI() {
        const btnText = document.getElementById('auth-display-name');
        const avatarImg = document.getElementById('auth-avatar-display');
        const iconDisplay = document.getElementById('auth-icon-display');
        const loginView = document.getElementById('login-form-view');
        const regView = document.getElementById('register-form-view');
        const profView = document.getElementById('profile-view');

        if (this.currentUser) {
            if (btnText) btnText.textContent = this.currentUser.displayName || this.currentUser.username;
            if (iconDisplay) iconDisplay.style.display = 'none';
            if (avatarImg) {
                avatarImg.style.display = 'block';
                avatarImg.src = this.currentUser.avatar || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.displayName)}&background=random`;
            }
            
            loginView?.classList.add('hidden');
            regView?.classList.add('hidden');
            profView?.classList.remove('hidden');

            const preview = document.getElementById('profile-avatar-preview');
            if (preview) {
                preview.src = avatarImg?.src || '';
                preview.dataset.avatarUrl = this.currentUser.avatar || '';
            }
        } else {
            if (btnText) btnText.textContent = 'Login';
            if (iconDisplay) iconDisplay.style.display = 'inline-block';
            if (avatarImg) avatarImg.style.display = 'none';
            
            loginView?.classList.remove('hidden');
            regView?.classList.add('hidden');
            profView?.classList.add('hidden');
        }
    }

    static async handleRegister() {
        const username = document.getElementById('reg-username')?.value.trim();
        const displayName = document.getElementById('reg-displayname')?.value.trim();
        const password = document.getElementById('reg-password')?.value;

        // Validation
        const usernameError = window.Validator?.username(username) || 
            (username.length < 3 ? 'Username quá ngắn' : null);
        if (usernameError) return Toast.error(usernameError);

        if (!displayName) return Toast.error('Display Name không được để trống.');

        const passwordError = window.Validator?.password(password);
        if (passwordError) return Toast.error(passwordError);

        // Check existing
        if (this.usersDb.find(u => u.username === username)) {
            return Toast.error('Username này đã tồn tại!');
        }

        // Hash password (simple hash for demo - use bcrypt in production)
        const hashedPassword = this.hashPassword(password);

        const newUser = {
            id: Date.now(),
            username,
            displayName,
            password: hashedPassword,
            avatar: '',
            createdAt: Date.now()
        };

        this.usersDb.push(newUser);
        StorageManager.set('users', this.usersDb);

        // Sync to Supabase
        if (this.supabaseClient) {
            try {
                await this.supabaseClient.from('quizlearn_users').insert([{
                    username,
                    displayName,
                    password: hashedPassword,
                    avatar: ''
                }]);
            } catch (e) {
                console.warn('Supabase sync failed:', e);
            }
        }

        Toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
        
        // Clear form and switch to login
        document.getElementById('reg-username').value = '';
        document.getElementById('reg-displayname').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('go-to-login')?.click();
    }

    static async handleLogin() {
        const username = document.getElementById('login-username')?.value.trim();
        const password = document.getElementById('login-password')?.value;

        if (!username || !password) {
            return Toast.error('Vui lòng điền đầy đủ thông tin!');
        }

        const hashedPassword = this.hashPassword(password);
        const match = this.usersDb.find(u => u.username === username && u.password === hashedPassword);

        if (!match) {
            return Toast.error('Sai Username hoặc Password!');
        }

        this.currentUser = match;
        StorageManager.set('currentUser', this.currentUser);
        
        // Clear form
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('auth-panel')?.classList.remove('show');
        
        this.updateAuthUI();
        Toast.success(`Chào mừng, ${this.currentUser.displayName}!`);
    }

    static async handleUpdateProfile() {
        if (!this.currentUser) return;

        const btn = document.getElementById('do-update-profile-btn');
        const originalText = btn?.innerHTML;
        
        const newAvatar = document.getElementById('profile-avatar-preview')?.dataset.avatarUrl || '';
        const newPassword = document.getElementById('prof-new-password')?.value.trim();

        if (newPassword) {
            const passwordError = window.Validator?.password(newPassword);
            if (passwordError) {
                Toast.error(passwordError);
                return;
            }
        }

        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;
        }

        const idx = this.usersDb.findIndex(u => u.username === this.currentUser.username);
        if (idx !== -1) {
            if (newAvatar) this.usersDb[idx].avatar = newAvatar;
            if (newPassword) this.usersDb[idx].password = this.hashPassword(newPassword);

            this.currentUser = this.usersDb[idx];
            StorageManager.set('users', this.usersDb);
            StorageManager.set('currentUser', this.currentUser);

            // Sync to Supabase
            if (this.supabaseClient) {
                try {
                    await this.supabaseClient.from('quizlearn_users')
                        .update({ 
                            avatar: this.currentUser.avatar, 
                            password: this.currentUser.password 
                        })
                        .eq('username', this.currentUser.username);
                } catch (e) {
                    console.warn('Supabase sync failed:', e);
                }
            }
        }

        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        
        document.getElementById('prof-new-password').value = '';
        this.updateAuthUI();
        Toast.success('Cập nhật Profile thành công!');
    }

    static handleAvatarUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Str = event.target.result;
            const preview = document.getElementById('profile-avatar-preview');
            if (preview) {
                preview.src = base64Str;
                preview.dataset.avatarUrl = base64Str;
            }
        };
        reader.readAsDataURL(file);
    }

    static handleLogout() {
        this.currentUser = null;
        StorageManager.remove('currentUser');
        this.updateAuthUI();
        document.getElementById('auth-panel')?.classList.remove('show');
        Toast.info('Đã đăng xuất.');
    }

    static hashPassword(password) {
        // Simple hash for demo - use bcrypt or argon2 in production
        // This is NOT secure for production - just for localStorage demo
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'hash_' + Math.abs(hash).toString(16);
    }

    static isAuthenticated() {
        return this.currentUser !== null;
    }

    static checkPermission(author) {
        if (!this.currentUser) return false;
        if (!author) return true;
        return author.username === this.currentUser.username;
    }
}

window.AuthModule = AuthModule;
export default AuthModule;
