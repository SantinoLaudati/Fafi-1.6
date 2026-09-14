# Fafi-1.6 PHP Backend - Dockerfile
# Multi-stage build for production

# Build stage
FROM composer:2.7 AS builder

WORKDIR /app

# Copy composer files (composer.lock no está versionado: se genera en el build)
COPY composer.json ./

# Install dependencies (no dev)
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-progress

# Production stage
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    linux-headers \
    $PHPIZE_DEPS \
    postgresql-dev \
    mysql-client \
    curl \
    bash \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Install Node.js for any build tools (optional)
RUN apk add --no-cache nodejs npm

# Configure PHP
COPY docker/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY docker/www.conf /usr/local/etc/php-fpm.d/www.conf

# Configure Nginx
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx-site.conf /etc/nginx/http.d/default.conf

# Configure Supervisor
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create app directory
WORKDIR /var/www/html

# Copy application code
COPY --from=builder /app/vendor ./vendor
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /var/log/nginx /var/log/php /var/log/supervisor \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/log/nginx /var/log/php /var/log/supervisor

# Expose ports
EXPOSE 80 443 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start supervisor (manages nginx, php-fpm, websocket)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]