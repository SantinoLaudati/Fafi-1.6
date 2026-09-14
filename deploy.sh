#!/bin/bash
# Fafi-1.6 Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
PROJECT_DIR="/var/www/fafi-1.6"
BACKUP_DIR="/var/backups/fafi-1.6"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting Fafi-1.6 deployment for $ENVIRONMENT..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

# Load environment
if [[ -f "$PROJECT_DIR/.env" ]]; then
    source "$PROJECT_DIR/.env"
else
    log_error ".env file not found in $PROJECT_DIR"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database (best-effort: no interrumpe el deploy si no hay nada que respaldar)
log_info "Backing up database..."
if docker compose version &> /dev/null; then
    docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T db \
        mysqldump -u root -p"$DB_ROOT_PASSWORD" fafi_1_6 \
        > "$BACKUP_DIR/db_backup_$DATE.sql" 2>/dev/null || log_warn "Database backup skipped (DB not ready?)"
else
    mysqldump -u root -p"$DB_ROOT_PASSWORD" fafi_1_6 \
        > "$BACKUP_DIR/db_backup_$DATE.sql" 2>/dev/null || log_warn "Database backup skipped"
fi
if [[ -s "$BACKUP_DIR/db_backup_$DATE.sql" ]]; then
    gzip "$BACKUP_DIR/db_backup_$DATE.sql"
    log_info "Database backup saved to $BACKUP_DIR/db_backup_$DATE.sql.gz"
else
    rm -f "$BACKUP_DIR/db_backup_$DATE.sql"
    log_warn "No database backup generated (primera instalacion)"
fi

# Backup current code
log_info "Backing up current code..."
tar -czf "$BACKUP_DIR/code_backup_$DATE.tar.gz" -C "$PROJECT_DIR" . --exclude=vendor --exclude=logs --exclude=.git || log_warn "Code backup skipped"
log_info "Code backup saved to $BACKUP_DIR/code_backup_$DATE.tar.gz"

# Pull latest code (branch master)
if [[ -d "$PROJECT_DIR/.git" ]]; then
    log_info "Pulling latest code from master..."
    cd "$PROJECT_DIR"
    git fetch origin
    git reset --hard origin/master
fi

# Install/update PHP dependencies
log_info "Installing PHP dependencies..."
cd "$PROJECT_DIR/database/php-backend"
composer install --no-dev --optimize-autoloader --no-interaction

# Run database migrations (if any)
log_info "Running database migrations..."
# Add migration commands here if needed
# php artisan migrate --force

# Clear caches
log_info "Clearing caches..."
# php artisan cache:clear
# php artisan config:clear
# php artisan view:clear

# Set permissions
log_info "Setting permissions..."
chown -R www-data:www-data "$PROJECT_DIR"
chmod -R 755 "$PROJECT_DIR"
chmod -R 777 "$PROJECT_DIR/database/php-backend/logs" 2>/dev/null || true

# Restart services
log_info "Restarting services..."
if docker compose version &> /dev/null; then
    # Docker deployment (usa .env de la raiz; copiar antes: cp .env.docker .env)
    cd "$PROJECT_DIR"
    docker compose -f docker-compose.yml up -d --build
    docker compose exec -T app php-fpm -t
else
    # Traditional deployment
    systemctl reload nginx
    systemctl restart php8.2-fpm
    systemctl restart fafi-websocket
fi

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 10

# Health check
log_info "Running health check..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    log_info "✅ Health check passed!"
else
    log_error "❌ Health check failed!"
    exit 1
fi

# Clean old backups (keep last 7 days)
log_info "Cleaning old backups..."
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

log_info "✅ Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Date: $(date)"
echo "   Backup: $BACKUP_DIR/db_backup_$DATE.sql.gz"
echo "   Health: OK"
echo ""
echo "🌐 Your game is now live at: http://$DOMAIN"
echo "🔌 WebSocket: ws://$DOMAIN/game"
echo "🩺 Health check: http://$DOMAIN/health"