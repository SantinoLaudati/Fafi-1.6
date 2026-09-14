<?php
/**
 * Database Configuration for Fafi-1.6
 * Supports both MySQL and PostgreSQL
 */

return [
    'driver' => env('DB_DRIVER', 'mysql'), // 'mysql' or 'pgsql'
    
    'mysql' => [
        'host' => env('DB_HOST', 'localhost'),
        'port' => env('DB_PORT', 3306),
        'database' => env('DB_NAME', 'fafi_1_6'),
        'username' => env('DB_USER', 'root'),
        'password' => env('DB_PASSWORD', ''),
        'charset' => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => '',
        'strict' => true,
        'engine' => 'InnoDB',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ]
    ],
    
    'pgsql' => [
        'host' => env('DB_HOST', 'localhost'),
        'port' => env('DB_PORT', 5432),
        'database' => env('DB_NAME', 'fafi_1_6'),
        'username' => env('DB_USER', 'postgres'),
        'password' => env('DB_PASSWORD', 'postgres'),
        'charset' => 'utf8',
        'prefix' => '',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    ]
];

function env($key, $default = null) {
    $value = getenv($key);
    if ($value === false) {
        // Try loading from .env file
        static $envLoaded = false;
        static $envVars = [];
        
        if (!$envLoaded) {
            $envPath = __DIR__ . '/../.env';
            if (file_exists($envPath)) {
                $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    if (str_starts_with(trim($line), '#')) continue;
                    if (strpos($line, '=') !== false) {
                        [$k, $v] = explode('=', $line, 2);
                        $envVars[trim($k)] = trim($v);
                    }
                }
            }
            $envLoaded = true;
        }
        
        return $envVars[$key] ?? $default;
    }
    return $value;
}