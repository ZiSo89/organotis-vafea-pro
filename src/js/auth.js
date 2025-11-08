/**
 * Authentication Manager
 * Handles user authentication with hardcoded credentials
 */

class AuthManager {
    constructor() {
        // Hardcoded credentials
        // ⚠️ CHANGE THESE BEFORE DEPLOYMENT!
        this.credentials = {
            username: 'admin',
            password: 'admin'
        };
        
        this.sessionKey = 'app_auth_session';
        this.tokenKey = 'app_auth_token';
        this.userKey = 'app_auth_user';
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const session = sessionStorage.getItem(this.sessionKey);
        const token = sessionStorage.getItem(this.tokenKey);
        return session === 'authenticated' && token !== null;
    }

    /**
     * Login with username and password
     */
    login(username, password) {
        if (username === this.credentials.username && 
            password === this.credentials.password) {
            
            // Generate session token
            const token = this.generateToken();
            
            // Store session data
            sessionStorage.setItem(this.sessionKey, 'authenticated');
            sessionStorage.setItem(this.tokenKey, token);
            sessionStorage.setItem(this.userKey, username);
            
            console.log('✅ User authenticated successfully');
            return {
                success: true,
                token: token,
                username: username
            };
        }
        
        console.log('❌ Authentication failed');
        return {
            success: false,
            error: 'Λάθος όνομα χρήστη ή κωδικός'
        };
    }

    /**
     * Logout user
     */
    logout() {
        sessionStorage.removeItem(this.sessionKey);
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.userKey);
        
        console.log('👋 User logged out');
        
        // Redirect to login page
        window.location.href = '/login.html';
    }

    /**
     * Check authentication and redirect if not authenticated
     */
    checkAuth() {
        if (!this.isAuthenticated()) {
            console.log('⚠️ Not authenticated - redirecting to login');
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        
        return {
            username: sessionStorage.getItem(this.userKey),
            token: sessionStorage.getItem(this.tokenKey)
        };
    }

    /**
     * Generate authentication token
     */
    generateToken() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return btoa(`${timestamp}.${random}`);
    }

    /**
     * Validate session (check if not expired)
     */
    validateSession() {
        // For now, sessions don't expire
        // You can add expiration logic here if needed
        return this.isAuthenticated();
    }

    /**
     * Get auth headers for API requests
     */
    getAuthHeaders() {
        const token = sessionStorage.getItem(this.tokenKey);
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
}

// Initialize global auth manager
const authManager = new AuthManager();

// Check authentication on page load (except on login page)
document.addEventListener('DOMContentLoaded', () => {
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (!isLoginPage) {
        authManager.checkAuth();
    }
});
