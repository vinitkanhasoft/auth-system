import { Request } from 'express';
import { UAParser } from 'ua-parser-js';

// Simple location extraction from IP
// For production, consider using a proper geolocation API service
const extractLocationFromIP = (ip: string): string => {
  // Handle localhost/local development
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') {
    return 'Local Development';
  }
  
  // Basic IP to location mapping (simplified)
  // In production, you'd use a service like ip-api.com, ipinfo.io, etc.
  const ipRanges: { [key: string]: string } = {
    // US ranges (simplified)
    '192.168': 'Local Network',
    '10.': 'Local Network',
    '172.16': 'Local Network',
    // Some common public ranges (very simplified)
    '8.8': 'United States',
    '1.1': 'United States',
    '208.67': 'United States',
  };
  
  // Check if IP matches any known ranges
  for (const range in ipRanges) {
    if (ip.startsWith(range)) {
      return ipRanges[range];
    }
  }
  
  // Default fallback
  return 'Unknown Location';
};

export interface DeviceInfo {
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
}

export const extractDeviceInfo = (req: Request): DeviceInfo => {
  const userAgent = req.get('User-Agent') || '';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  // Get device information with better fallbacks
  const deviceType = result.device.type || 'Desktop';
  const browserName = result.browser.name || 'Unknown';
  const browserVersion = result.browser.version || '';
  const osName = result.os.name || 'Unknown';
  const osVersion = result.os.version || '';
  
  const device = deviceType;
  const browser = browserVersion ? `${browserName} ${browserVersion}` : browserName;
  const os = osVersion ? `${osName} ${osVersion}` : osName;
  
  // Get IP address with better fallbacks
  const ip = req.ip || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress || 
             (req.connection as any)?.socket?.remoteAddress || 
             '0.0.0.0';
  
  // Extract location from IP using a simple approach
  // Note: For production, consider using a proper geolocation service
  const location = extractLocationFromIP(ip);
  
  return {
    device,
    browser,
    os,
    ip,
    location,
  };
};
