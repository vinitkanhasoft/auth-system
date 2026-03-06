// Add browser types for client-side usage
declare global {
  interface Window {
    localStorage: Storage;
  }
  const localStorage: Storage;
}

import { JwtUtils } from './jwt';
import { TokenTypes } from '../enums/TokenTypes';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  sessionId?: string;
}

interface TokenRefreshConfig {
  refreshThreshold: number; // Time in seconds before expiration to refresh
  maxRetries: number;
  retryDelay: number; // Delay between retries in ms
}

export class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string> | null = null;
  private config: TokenRefreshConfig = {
    refreshThreshold: 300, // 5 minutes before expiration
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  };

  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Store tokens in localStorage
   */
  public static storeTokens(tokens: TokenPair): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    if (tokens.sessionId) {
      localStorage.setItem('sessionId', tokens.sessionId);
    }
  }

  /**
   * Get stored tokens
   */
  public static getStoredTokens(): TokenPair | null {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const sessionId = localStorage.getItem('sessionId');

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      sessionId: sessionId || undefined,
    };
  }

  /**
   * Clear stored tokens
   */
  public static clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionId');
  }

  /**
   * Check if access token is expired or will expire soon
   */
  public static isTokenExpiredOrExpiringSoon(token: string, thresholdSeconds: number = 300): boolean {
    try {
      const decoded = JwtUtils.decodeToken(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiration = decoded.exp - currentTime;
      
      return timeUntilExpiration <= thresholdSeconds;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Refresh access token automatically
   */
  public async refreshAccessToken(): Promise<string> {
    // If refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newAccessToken = await this.refreshPromise;
      return newAccessToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const tokens = TokenManager.getStoredTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    let retryCount = 0;
    
    while (retryCount < this.config.maxRetries) {
      try {
        const response = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: tokens.refreshToken,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Refresh token is invalid, clear all tokens
            TokenManager.clearTokens();
            throw new Error('Refresh token expired. Please login again.');
          }
          throw new Error(`Token refresh failed: ${response.statusText}`);
        }

        const data = await response.json() as any;
        
        if (data.success && data.data?.accessToken) {
          // Update stored access token
          const updatedTokens = {
            ...tokens,
            accessToken: data.data.accessToken,
          };
          TokenManager.storeTokens(updatedTokens);
          
          return data.data.accessToken;
        } else {
          throw new Error('Invalid response from token refresh');
        }
      } catch (error) {
        retryCount++;
        
        if (retryCount >= this.config.maxRetries) {
          // If all retries failed, clear tokens and throw error
          TokenManager.clearTokens();
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }

    throw new Error('Token refresh failed after maximum retries');
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  public async getValidAccessToken(): Promise<string> {
    const tokens = TokenManager.getStoredTokens();
    
    if (!tokens?.accessToken) {
      throw new Error('No access token available');
    }

    // Check if token is expired or expiring soon
    if (TokenManager.isTokenExpiredOrExpiringSoon(tokens.accessToken, this.config.refreshThreshold)) {
      try {
        return await this.refreshAccessToken();
      } catch (error) {
        // If refresh fails, clear tokens and throw error
        TokenManager.clearTokens();
        throw error;
      }
    }

    return tokens.accessToken;
  }

  /**
   * Setup automatic token refresh timer
   */
  public setupAutoRefresh(): void {
    setInterval(async () => {
      try {
        await this.getValidAccessToken();
        console.log('Token auto-refreshed successfully');
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        // Optionally redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Enhanced fetch wrapper that handles token refresh automatically
   */
  public async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      const authOptions: RequestInit = {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      };

      return fetch(url, authOptions);
    } catch (error) {
      // If we can't get a valid token, the request should fail
      throw new Error(`Authentication failed: ${error}`);
    }
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();
