// ============================================
// QuizLearn - Toast Notification System
// ============================================

class Toast {
    static container = null;
    
    static init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(this.container);
    }

    static show(message, type = 'info', duration = 4000) {
        this.init();
        
        const toast = document.createElement('div');
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
        `;

        toast.innerHTML = `
            <i class="fas ${icons[type]}" style="color: ${colors[type]}; font-size: 1.4rem;"></i>
            <span style="flex: 1; color: #2d3748; font-size: 0.95rem; line-height: 1.4;">${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: #a0aec0;
                cursor: pointer;
                font-size: 1.2rem;
                padding: 4px;
            ">&times;</button>
        `;

        this.container.appendChild(toast);

        // Add animation keyframes if not exists
        if (!document.getElementById('toast-animation')) {
            const style = document.createElement('style');
            style.id = 'toast-animation';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    static success(message, duration) { this.show(message, 'success', duration); }
    static error(message, duration) { this.show(message, 'error', duration); }
    static warning(message, duration) { this.show(message, 'warning', duration); }
    static info(message, duration) { this.show(message, 'info', duration); }
}

window.Toast = Toast;
export default Toast;
