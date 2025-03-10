const cache = (duration) => {
    const cacheMap = new Map();
    
    return (req, res, next) => {
        const key = req.originalUrl || req.url;
        const cachedResponse = cacheMap.get(key);

        if (cachedResponse) {
            const now = Date.now();
            if (now < cachedResponse.expiry) {
                return res.json(cachedResponse.data);
            }
            cacheMap.delete(key);
        }

        res.originalJson = res.json;
        res.json = (body) => {
            const expiry = Date.now() + parseDuration(duration);
            cacheMap.set(key, {
                data: body,
                expiry
            });
            res.originalJson(body);
        };

        next();
    };
};

function parseDuration(duration) {
    const match = duration.match(/^(\d+)\s*(minute|minutes|hour|hours|day|days)$/);
    if (!match) return 60 * 1000; // Default 1 minute

    const value = parseInt(match[1]);
    const unit = match[2];

    switch(unit) {
        case 'minute':
        case 'minutes':
            return value * 60 * 1000;
        case 'hour':
        case 'hours':
            return value * 60 * 60 * 1000;
        case 'day':
        case 'days':
            return value * 24 * 60 * 60 * 1000;
        default:
            return 60 * 1000;
    }
}

module.exports = cache;
