

class CacheManager {
    constructor() {
        this.cache = new Map();
    }

    
    set(key, value, ttlSeconds = 9000) { 
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, {
            value,
            expiresAt
        });
    }

    
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    
    has(key) {
        return this.get(key) !== null;
    }

    
    delete(key) {
        this.cache.delete(key);
    }

    
    clear() {
        this.cache.clear();
    }

    
    getStats() {
        let activeCount = 0;
        let expiredCount = 0;

        for (const [key, item] of this.cache.entries()) {
            if (Date.now() > item.expiresAt) {
                expiredCount++;
            } else {
                activeCount++;
            }
        }

        return {
            total: this.cache.size,
            active: activeCount,
            expired: expiredCount
        };
    }

    
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}


const cache = new CacheManager();


setInterval(() => {
    cache.cleanup();
    console.log('Cache cleanup completed. Stats:', cache.getStats());
}, 3600000); 

module.exports = cache;
