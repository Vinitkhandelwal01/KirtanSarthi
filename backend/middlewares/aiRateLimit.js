const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

// Lightweight per-process limiter. Use Redis-backed limiter in multi-instance production.
const buckets = new Map();

const aiRateLimit = (req, res, next) => {
  try {
    const key = req.user?.id || req.ip || "anonymous";
    const now = Date.now();

    const entry = buckets.get(key);
    if (!entry || now >= entry.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }

    if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(Math.max(1, retryAfterSeconds)));
      return res.status(429).json({
        success: false,
        message: "Too many AI requests. Please retry shortly.",
      });
    }

    entry.count += 1;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Rate limiter failed",
    });
  }
};

module.exports = aiRateLimit;
