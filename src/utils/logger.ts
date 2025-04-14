import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Simple logging utility that writes to a file instead of stdout/stderr
 * to avoid interfering with the MCP server transport
 */
export class Logger {
  private logFilePath: string;
  private logStream: fs.WriteStream | null = null;
  
  constructor(options: {
    logDir?: string;
    logFileName?: string;
  } = {}) {
    // relative dir as default
    const logDir = options.logDir || path.join(process.cwd(), 'logs');
    const logFileName = options.logFileName || `mcp-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    this.logFilePath = path.join(logDir, logFileName);
    this.initLogStream();
  }
  
  private initLogStream() {
    try {
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
      this.info(`Logger initialized. Log file: ${this.logFilePath}`);
    } catch (error) {
      // Can't log the error since we're initializing the logger
      // Just silently fail
    }
  }
  
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}\n`;
  }
  
  private write(level: string, message: string) {
    if (!this.logStream) {
      this.initLogStream();
    }
    
    if (this.logStream) {
      const formattedMessage = this.formatMessage(level, message);
      this.logStream.write(formattedMessage);
    }
  }
  
  /**
   * Log debug level message
   */
  debug(message: string) {
    this.write('DEBUG', message);
  }
  
  /**
   * Log info level message
   */
  info(message: string) {
    this.write('INFO', message);
  }
  
  /**
   * Log warning level message
   */
  warn(message: string) {
    this.write('WARN', message);
  }
  
  /**
   * Log error level message
   */
  error(message: string) {
    this.write('ERROR', message);
  }
  
  /**
   * Close the log stream
   */
  close() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

// Create a default logger instance
export const logger = new Logger(
  {
    logDir: process.env.LOG_DIR,
    }
);
