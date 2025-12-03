<?php
/**
 * Οργανωτής Βαφέα Pro - Logging System
 * Κεντρικό σύστημα logging με δυνατότητα ενεργοποίησης/απενεργοποίησης
 */

/**
 * Custom logger function
 * 
 * @param string $message Το μήνυμα προς καταγραφή
 * @param string $level Το επίπεδο (INFO, WARNING, ERROR, DEBUG)
 * @param array $context Επιπλέον context data
 */
function logMessage($message, $level = 'INFO', $context = []) {
    // Check if debug mode is enabled
    if (!defined('DEBUG_MODE') || !DEBUG_MODE) {
        return;
    }
    
    $logDir = __DIR__ . '/../logs';
    
    // Create logs directory if it doesn't exist
    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    // Log file path - one file per day
    $logFile = $logDir . '/app_' . date('Y-m-d') . '.log';
    
    // Format the log entry
    $timestamp = date('Y-m-d H:i:s');
    // Encode context as UTF-8-friendly JSON (allow partial output on error)
    $contextStr = '';
    if (!empty($context)) {
        $contextStr = ' | Context: ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }

    $logEntry = "[{$timestamp}] [{$level}] {$message}{$contextStr}" . PHP_EOL;

    // Ensure the log entry is valid UTF-8. Try to detect and convert common encodings.
    if (!function_exists('ensure_utf8')) {
        function ensure_utf8($str) {
            if (mb_detect_encoding($str, 'UTF-8', true) !== false) {
                return $str;
            }

            $enc = mb_detect_encoding($str, array('UTF-8','ISO-8859-7','WINDOWS-1253','CP1253','ISO-8859-1','WINDOWS-1252'), true);
            if ($enc && $enc !== 'UTF-8') {
                return mb_convert_encoding($str, 'UTF-8', $enc);
            }

            // Last resort: attempt a best-effort conversion
            return mb_convert_encoding($str, 'UTF-8', 'auto');
        }
    }

    $logEntry = ensure_utf8($logEntry);

    // Write to file (UTF-8 bytes). No BOM.
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * Log info message
 */
function logInfo($message, $context = []) {
    logMessage($message, 'INFO', $context);
}

/**
 * Log warning message
 */
function logWarning($message, $context = []) {
    logMessage($message, 'WARNING', $context);
}

/**
 * Log error message
 */
function logError($message, $context = []) {
    logMessage($message, 'ERROR', $context);
}

/**
 * Log debug message
 */
function logDebug($message, $context = []) {
    logMessage($message, 'DEBUG', $context);
}

/**
 * Log SQL query
 */
function logQuery($query, $params = []) {
    if (!defined('DEBUG_MODE') || !DEBUG_MODE) {
        return;
    }
    
    logMessage('SQL Query: ' . $query, 'DEBUG', ['params' => $params]);
}

/**
 * Log API request with performance tracking
 */
function logApiRequest($endpoint, $method, $data = []) {
    if (!defined('DEBUG_MODE') || !DEBUG_MODE) {
        return;
    }
    
    // Store request start time in global for performance tracking
    $GLOBALS['_request_start_time'] = microtime(true);
    $GLOBALS['_request_endpoint'] = $endpoint;
    $GLOBALS['_request_method'] = $method;
    
    // Sanitize sensitive data before logging
    $sanitizedData = sanitizeLogData($data);
    
    logMessage("API Request: {$method} {$endpoint}", 'INFO', [
        'data' => $sanitizedData,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'referer' => $_SERVER['HTTP_REFERER'] ?? 'Direct',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Log API response with performance metrics
 */
function logApiResponse($endpoint, $statusCode, $response = null) {
    if (!defined('DEBUG_MODE') || !DEBUG_MODE) {
        return;
    }
    
    // Calculate request duration
    $duration = 0;
    if (isset($GLOBALS['_request_start_time'])) {
        $duration = round((microtime(true) - $GLOBALS['_request_start_time']) * 1000, 2); // ms
    }
    
    $level = $statusCode >= 400 ? 'ERROR' : 'INFO';
    
    // Sanitize response data
    $sanitizedResponse = is_array($response) ? sanitizeLogData($response) : $response;
    
    logMessage("API Response: {$endpoint} - Status: {$statusCode} - Duration: {$duration}ms", $level, [
        'response' => $sanitizedResponse,
        'status_code' => $statusCode,
        'duration_ms' => $duration,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeLogData($data) {
    if (!is_array($data)) {
        return $data;
    }
    
    $sensitiveKeys = ['password', 'token', 'api_key', 'secret', 'authorization'];
    $sanitized = [];
    
    foreach ($data as $key => $value) {
        $keyLower = strtolower($key);
        $isSensitive = false;
        
        foreach ($sensitiveKeys as $sensitiveKey) {
            if (strpos($keyLower, $sensitiveKey) !== false) {
                $isSensitive = true;
                break;
            }
        }
        
        if ($isSensitive) {
            $sanitized[$key] = '***REDACTED***';
        } elseif (is_array($value)) {
            $sanitized[$key] = sanitizeLogData($value);
        } else {
            $sanitized[$key] = $value;
        }
    }
    
    return $sanitized;
}

/**
 * Log slow queries (queries taking more than threshold)
 */
function logSlowQuery($query, $duration, $params = [], $threshold = 100) {
    if (!defined('DEBUG_MODE') || !DEBUG_MODE) {
        return;
    }
    
    if ($duration > $threshold) {
        logMessage("SLOW QUERY DETECTED: {$duration}ms", 'WARNING', [
            'query' => $query,
            'params' => $params,
            'duration_ms' => $duration,
            'threshold_ms' => $threshold
        ]);
    }
}

?>
