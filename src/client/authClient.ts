import { tokenManager, TokenManager } from '../utils/tokenManager';

/**
 * Client-side authentication service for automatic token management
 */
export class AuthClient {
  private static instance: AuthClient;

  private constructor() {
    // Setup auto-refresh when client is initialized
    if (typeof window !== 'undefined') {
      tokenManager.setupAutoRefresh();
    }
  }

  public static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  /**
   * Login and store tokens
   */
  public async login(email: string, password: string) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json() as any;

      if (data.success && data.data) {
        // Store tokens for automatic management
        TokenManager.storeTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          sessionId: data.data.sessionId,
        });

        return data;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout and clear tokens
   */
  public async logout() {
    const tokens = TokenManager.getStoredTokens();
    
    if (tokens) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.accessToken}`,
          },
          body: JSON.stringify({
            refreshToken: tokens.refreshToken,
            sessionId: tokens.sessionId,
          }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear tokens regardless of API call success
    TokenManager.clearTokens();
  }

  /**
   * Make authenticated API calls with automatic token refresh
   */
  public async apiCall(url: string, options: RequestInit = {}) {
    try {
      return await tokenManager.authenticatedFetch(url, options);
    } catch (error) {
      console.error('API call failed:', error);
      
      // If authentication failed, redirect to login
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  public async getProfile() {
    return this.apiCall('/api/auth/profile');
  }

  /**
   * Update user profile
   */
  public async updateProfile(profileData: any) {
    return this.apiCall('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Get active sessions
   */
  public async getActiveSessions() {
    return this.apiCall('/api/auth/sessions');
  }

  /**
   * Revoke a session
   */
  public async revokeSession(sessionId: string) {
    return this.apiCall('/api/auth/revoke-session', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    const tokens = TokenManager.getStoredTokens();
    if (!tokens) return false;

    // Check if access token is still valid
    return !TokenManager.isTokenExpiredOrExpiringSoon(tokens.accessToken, 0);
  }

  /**
   * Get current access token
   */
  public async getCurrentAccessToken(): Promise<string> {
    return tokenManager.getValidAccessToken();
  }
}

// Export singleton instance
export const authClient = AuthClient.getInstance();

// Example usage in React/Vue/Angular components:

/*
// Login example
try {
  const result = await authClient.login('user@example.com', 'password');
  console.log('Login successful:', result);
} catch (error) {
  console.error('Login failed:', error);
}

// API call example (automatic token refresh)
try {
  const profileResponse = await authClient.getProfile();
  const profile = await profileResponse.json();
  console.log('User profile:', profile);
} catch (error) {
  console.error('Failed to get profile:', error);
}

// Check authentication status
if (authClient.isAuthenticated()) {
  // User is logged in, show protected content
} else {
  // Redirect to login
  window.location.href = '/login';
}

// Logout example
await authClient.logout();
window.location.href = '/login';
*/
