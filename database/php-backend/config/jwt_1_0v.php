<?php
/**
 * JWT Handler for Fafi-1.6
 * Uses firebase/php-jwt or native implementation
 */

class JWT {
    private static $secret;
    private static $algorithm = 'HS256';
    private static $expiry = 604800; // 7 days in seconds
    
    public static function init() {
        self::$secret = env('JWT_SECRET', 'fafi-1-6-super-secret-jwt-key-change-in-production');
        $exp = env('JWT_EXPIRES_IN', '7d');
        self::$expiry = self::parseExpiry($exp);
    }
    
    private static function parseExpiry($exp) {
        $unit = substr($exp, -1);
        $value = (int)substr($exp, 0, -1);
        switch ($unit) {
            case 's': return $value;
            case 'm': return $value * 60;
            case 'h': return $value * 3600;
            case 'd': return $value * 86400;
            default: return 604800;
        }
    }
    
    public static function encode($payload) {
        if (self::$secret === null) self::init();
        
        $header = json_encode(['typ' => 'JWT', 'alg' => self::$algorithm]);
        $payload['iat'] = time();
        $payload['exp'] = time() + self::$expiry;
        $payload = json_encode($payload);
        
        $base64Header = self::base64UrlEncode($header);
        $base64Payload = self::base64UrlEncode($payload);
        $signature = self::sign($base64Header . '.' . $base64Payload);
        
        return $base64Header . '.' . $base64Payload . '.' . $signature;
    }
    
    public static function decode($token) {
        if (self::$secret === null) self::init();
        
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        
        [$base64Header, $base64Payload, $signature] = $parts;
        
        // Verify signature
        $expectedSignature = self::sign($base64Header . '.' . $base64Payload);
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }
        
        $payload = json_decode(self::base64UrlDecode($base64Payload), true);
        
        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }
        
        return $payload;
    }
    
    public static function validate($token) {
        $decoded = self::decode($token);
        return $decoded !== null;
    }
    
    private static function sign($data) {
        return self::base64UrlEncode(hash_hmac('sha256', $data, self::$secret, true));
    }
    
    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    private static function base64UrlDecode($data) {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
    
    public static function getBearerToken() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }
}