#!/bin/bash

# Log Management Script for Automation Dashboard
# This script provides utilities for managing application logs

LOGS_DIR="./logs"
BACKUP_DIR="./logs/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create directories if they don't exist
mkdir -p "$LOGS_DIR" "$BACKUP_DIR"

show_help() {
    echo "Automation Dashboard Log Management"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status     Show log files and disk usage"
    echo "  tail       Tail the current log file"
    echo "  search     Search logs for patterns"
    echo "  archive    Archive old logs manually"
    echo "  clean      Clean up old logs (keeps last 7 days)"
    echo "  rotate     Force log rotation"
    echo "  analyze    Generate log analysis report"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 search 'ERROR'"
    echo "  $0 search 'database_operation' --json"
    echo "  $0 tail"
    echo "  $0 clean"
}

show_status() {
    echo -e "${GREEN}📊 Log File Status${NC}"
    echo "=================================="
    
    if [ -d "$LOGS_DIR" ]; then
        echo "📁 Log Directory: $LOGS_DIR"
        echo "💾 Disk Usage:"
        du -h "$LOGS_DIR" 2>/dev/null || echo "No logs directory found"
        echo ""
        
        echo "📄 Log Files:"
        if ls "$LOGS_DIR"/*.log* 1> /dev/null 2>&1; then
            ls -lh "$LOGS_DIR"/*.log* | while read line; do
                echo "   $line"
            done
        else
            echo "   No log files found"
        fi
        echo ""
        
        echo "🗜️ Compressed Logs:"
        if ls "$LOGS_DIR"/*.gz 1> /dev/null 2>&1; then
            ls -lh "$LOGS_DIR"/*.gz | while read line; do
                echo "   $line"
            done
        else
            echo "   No compressed logs found"
        fi
    else
        echo "❌ Logs directory not found: $LOGS_DIR"
    fi
}

tail_logs() {
    local log_file="$LOGS_DIR/dashboard.log"
    
    if [ -f "$log_file" ]; then
        echo -e "${GREEN}📜 Tailing current log file: $log_file${NC}"
        echo "Press Ctrl+C to exit"
        echo "=================================="
        tail -f "$log_file"
    else
        echo -e "${RED}❌ Current log file not found: $log_file${NC}"
        echo "Start the application to generate logs"
    fi
}

search_logs() {
    local pattern="$1"
    local format="$2"
    
    if [ -z "$pattern" ]; then
        read -p "Enter search pattern: " pattern
    fi
    
    if [ -z "$pattern" ]; then
        echo -e "${RED}❌ No search pattern provided${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}🔍 Searching logs for: '$pattern'${NC}"
    echo "=================================="
    
    # Search in current log
    if [ -f "$LOGS_DIR/dashboard.log" ]; then
        echo "📄 Current log (dashboard.log):"
        if [ "$format" = "--json" ]; then
            grep "$pattern" "$LOGS_DIR/dashboard.log" | head -20
        else
            grep --color=always "$pattern" "$LOGS_DIR/dashboard.log" | head -20
        fi
        echo ""
    fi
    
    # Search in compressed logs
    if ls "$LOGS_DIR"/*.gz 1> /dev/null 2>&1; then
        echo "🗜️ Compressed logs:"
        for gz_file in "$LOGS_DIR"/*.gz; do
            echo "  📁 $(basename "$gz_file"):"
            if [ "$format" = "--json" ]; then
                zcat "$gz_file" | grep "$pattern" | head -10
            else
                zcat "$gz_file" | grep --color=always "$pattern" | head -10
            fi
        done
    fi
}

archive_logs() {
    echo -e "${GREEN}📦 Archiving old logs${NC}"
    echo "=================================="
    
    local archive_name="logs_archive_$(date +%Y%m%d_%H%M%S).tar.gz"
    local archive_path="$BACKUP_DIR/$archive_name"
    
    if ls "$LOGS_DIR"/*.gz 1> /dev/null 2>&1; then
        tar -czf "$archive_path" -C "$LOGS_DIR" *.gz
        echo "✅ Created archive: $archive_path"
        
        # Remove original compressed files
        rm "$LOGS_DIR"/*.gz
        echo "🗑️ Removed original compressed files"
    else
        echo "ℹ️ No compressed logs to archive"
    fi
}

clean_logs() {
    echo -e "${GREEN}🧹 Cleaning old logs${NC}"
    echo "=================================="
    
    local days_to_keep=7
    echo "🗓️ Keeping logs from last $days_to_keep days"
    
    # Remove old compressed logs
    find "$LOGS_DIR" -name "*.gz" -mtime +$days_to_keep -type f -print -delete 2>/dev/null
    
    # Remove old archives
    find "$BACKUP_DIR" -name "logs_archive_*.tar.gz" -mtime +30 -type f -print -delete 2>/dev/null
    
    echo "✅ Cleanup completed"
    show_status
}

force_rotate() {
    echo -e "${GREEN}🔄 Forcing log rotation${NC}"
    echo "=================================="
    
    if [ -f "$LOGS_DIR/dashboard.log" ]; then
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local rotated_name="$LOGS_DIR/dashboard.log.$timestamp"
        
        mv "$LOGS_DIR/dashboard.log" "$rotated_name"
        gzip "$rotated_name"
        
        echo "✅ Rotated log to: $rotated_name.gz"
        echo "ℹ️ New log file will be created when application restarts"
    else
        echo "ℹ️ No current log file to rotate"
    fi
}

analyze_logs() {
    echo -e "${GREEN}📈 Log Analysis Report${NC}"
    echo "=================================="
    
    local log_file="$LOGS_DIR/dashboard.log"
    
    if [ ! -f "$log_file" ]; then
        echo -e "${RED}❌ No current log file found${NC}"
        return 1
    fi
    
    echo "📅 Analysis Period: Last 1000 log entries"
    echo ""
    
    echo "🚨 Error Summary:"
    echo "   Errors: $(grep -c '"level":"ERROR"' "$log_file" 2>/dev/null || echo 0)"
    echo "   Warnings: $(grep -c '"level":"WARN"' "$log_file" 2>/dev/null || echo 0)"
    echo ""
    
    echo "🗄️ Database Operations:"
    echo "   Queries: $(grep -c '"operation":"query_execution"' "$log_file" 2>/dev/null || echo 0)"
    echo "   Slow Queries (>2s): $(grep '"operation":"query_execution"' "$log_file" | grep -c '"duration_ms":[2-9][0-9][0-9][0-9]' 2>/dev/null || echo 0)"
    echo ""
    
    echo "🌐 API Requests:"
    echo "   Total: $(grep -c '"component":"api"' "$log_file" 2>/dev/null || echo 0)"
    echo "   Errors (4xx/5xx): $(grep '"component":"api"' "$log_file" | grep -c '"status":[4-5][0-9][0-9]' 2>/dev/null || echo 0)"
    echo ""
    
    echo "🔝 Top API Endpoints:"
    grep '"path":"' "$log_file" 2>/dev/null | sed 's/.*"path":"\([^"]*\)".*/\1/' | sort | uniq -c | sort -nr | head -5
    echo ""
    
    echo "⚡ Performance:"
    echo "   Requests >5s: $(grep '"duration_ms":[5-9][0-9][0-9][0-9]' "$log_file" 2>/dev/null | wc -l || echo 0)"
    echo "   Average Response Time: $(grep '"duration_ms":' "$log_file" | tail -100 | sed 's/.*"duration_ms":\([0-9]*\).*/\1/' | awk '{sum+=$1; n++} END {if(n>0) printf "%.0fms", sum/n; else print "N/A"}')"
}

# Main command handler
case "$1" in
    "status")
        show_status
        ;;
    "tail")
        tail_logs
        ;;
    "search")
        search_logs "$2" "$3"
        ;;
    "archive")
        archive_logs
        ;;
    "clean")
        clean_logs
        ;;
    "rotate")
        force_rotate
        ;;
    "analyze")
        analyze_logs
        ;;
    "help"|""|*)
        show_help
        ;;
esac