import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

class Logger {
  private logLevel: LogLevel;
  private logStream?: WriteStream;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;

    if (process.env.NODE_ENV === 'production') {
      this.initializeFileLogging();
    }
  }

  private initializeFileLogging(): void {
    try {
      const logPath = join(process.cwd(), 'logs', 'app.log');
      this.logStream = createWriteStream(logPath, { flags: 'a' });
    } catch (error) {
      console.error('Failed to initialize file logging:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  private writeLog(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, ...args);

    // Always log to console
    console.log(formattedMessage);

    // Log to file in production
    if (this.logStream && process.env.NODE_ENV === 'production') {
      this.logStream.write(formattedMessage + '\n');
    }
  }

  public error(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.ERROR, message, ...args);
  }

  public warn(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.WARN, message, ...args);
  }

  public info(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.INFO, message, ...args);
  }

  public debug(message: string, ...args: any[]): void {
    this.writeLog(LogLevel.DEBUG, message, ...args);
  }

  public close(): void {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

export const logger = new Logger();

// Handle process exit
process.on('SIGINT', () => {
  logger.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.close();
  process.exit(0);
});
