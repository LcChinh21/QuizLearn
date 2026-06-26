// ============================================
// QuizLearn - Input Validation Utilities
// ============================================

class Validator {
    static minLength(str, min, fieldName = 'Field') {
        if (!str || str.length < min) {
            return `${fieldName} phải có ít nhất ${min} ký tự.`;
        }
        return null;
    }

    static maxLength(str, max, fieldName = 'Field') {
        if (str && str.length > max) {
            return `${fieldName} không được vượt quá ${max} ký tự.`;
        }
        return null;
    }

    static required(str, fieldName = 'Field') {
        if (!str || !str.trim()) {
            return `${fieldName} không được để trống.`;
        }
        return null;
    }

    static username(str) {
        if (!str) return 'Username không được để trống.';
        if (str.length < 3) return 'Username phải có ít nhất 3 ký tự.';
        if (str.length > 30) return 'Username không được vượt quá 30 ký tự.';
        if (!/^[a-zA-Z0-9_]+$/.test(str)) {
            return 'Username chỉ được chứa chữ cái, số và dấu gạch dưới.';
        }
        return null;
    }

    static password(str) {
        if (!str) return 'Password không được để trống.';
        if (str.length < 6) return 'Password phải có ít nhất 6 ký tự.';
        if (str.length > 100) return 'Password không được vượt quá 100 ký tự.';
        return null;
    }

    static email(str) {
        if (!str) return null; // Email không bắt buộc
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(str)) {
            return 'Email không hợp lệ.';
        }
        return null;
    }

    static validatePassword(password) {
        const errors = [];
        if (password.length < 8) errors.push('ít nhất 8 ký tự');
        if (!/[A-Z]/.test(password)) errors.push('ít nhất 1 chữ hoa');
        if (!/[a-z]/.test(password)) errors.push('ít nhất 1 chữ thường');
        if (!/[0-9]/.test(password)) errors.push('ít nhất 1 số');
        
        if (errors.length > 0) {
            return `Password phải có ${errors.join(', ')}.`;
        }
        return null;
    }

    static sanitize(str) {
        if (!str) return '';
        return str
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .trim();
    }
}

window.Validator = Validator;
export default Validator;
