// Tiny logger wrapper so we have a single place to swap for pino/winston later.
const stamp = () => new Date().toISOString();

module.exports = {
  info: (...args) => console.log(`[${stamp()}] [INFO]`, ...args),
  warn: (...args) => console.warn(`[${stamp()}] [WARN]`, ...args),
  error: (...args) => console.error(`[${stamp()}] [ERROR]`, ...args),
};
