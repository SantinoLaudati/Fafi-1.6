<?php
/**
 * Database Connection Manager
 * Singleton pattern for PDO connection
 */

require_once __DIR__ . '/database.php';

class Database {
    private static $instance = null;
    private $pdo;
    private $config;
    
    private function __construct() {
        $this->config = getDbConfig();
        $this->connect();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function connect() {
        $driver = $this->config['driver'];
        $dbConfig = $this->config[$driver];
        
        $dsn = $this->buildDsn($driver, $dbConfig);
        
        try {
            $this->pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $dbConfig['options']);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    private function buildDsn($driver, $config) {
        if ($driver === 'mysql') {
            return "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset={$config['charset']}";
        } elseif ($driver === 'pgsql') {
            return "pgsql:host={$config['host']};port={$config['port']};dbname={$config['database']}";
        }
        throw new Exception("Unsupported database driver: $driver");
    }
    
    public function getPdo() {
        // Check connection and reconnect if needed
        try {
            $this->pdo->query('SELECT 1');
        } catch (PDOException $e) {
            $this->connect();
        }
        return $this->pdo;
    }
    
    public function query($sql, $params = []) {
        $stmt = $this->getPdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
    
    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }
    
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }
    
    public function insert($table, $data) {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        $this->query($sql, $data);
        return $this->getPdo()->lastInsertId();
    }
    
    public function update($table, $data, $where, $whereParams = []) {
        $set = [];
        foreach (array_keys($data) as $column) {
            $set[] = "{$column} = :{$column}";
        }
        $sql = "UPDATE {$table} SET " . implode(', ', $set) . " WHERE {$where}";
        $params = array_merge($data, $whereParams);
        $this->query($sql, $params);
        return $this->getPdo()->rowCount();
    }
    
    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        $this->query($sql, $params);
        return $this->getPdo()->rowCount();
    }
    
    public function beginTransaction() {
        return $this->getPdo()->beginTransaction();
    }
    
    public function commit() {
        return $this->getPdo()->commit();
    }
    
    public function rollback() {
        return $this->getPdo()->rollback();
    }
    
    // Prevent cloning and unserialization
    private function __clone() {}
    public function __wakeup() {}
}

// Helper function
function db() {
    return Database::getInstance();
}