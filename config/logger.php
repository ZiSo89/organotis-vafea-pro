<?php
/* ========================================
   Logger Helper - Custom Logging System
   ======================================== */

class Logger {
    private static $logFile = null;
    
    /**
     * Initialize logger with log file path
     */
    public static function init($filename = 'app.log') {
        self::$logFile = __DIR__ . '/../logs/' . $filename;
        
        // Create logs directory if it doesn't exist
        $logDir = dirname(self::$logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        // Ensure log file is writable
        if (!file_exists(self::$logFile)) {
            touch(self::$logFile);
            chmod(self::$logFile, 0644);
        }
    }
    
    /**
     * Write a log message
     */
    public static function log($message, $level = 'INFO') {
        if (self::$logFile === null) {
            self::init();
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;
        
        // Write to file
        file_put_contents(self::$logFile, $logMessage, FILE_APPEND);
        
        // Also write to PHP error log if in debug mode
        if (defined('DEBUG') && DEBUG) {
            error_log($message);
        }
    }
    
    /**
     * Log info message
     */
    public static function info($message) {
        self::log($message, 'INFO');
    }
    
    /**
     * Log error message
     */
    public static function error($message) {
        self::log($message, 'ERROR');
    }
    
    /**
     * Log debug message
     */
    public static function debug($message) {
        self::log($message, 'DEBUG');
    }
    
    /**
     * Log warning message
     */
    public static function warning($message) {
        self::log($message, 'WARNING');
    }
    
    /**
     * Log a separator line
     */
    public static function separator() {
        self::log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'INFO');
    }
    
    /**
     * Clear the log file
     */
    public static function clear() {
        if (self::$logFile === null) {
            self::init();
        }
        file_put_contents(self::$logFile, '');
    }
}

?>
