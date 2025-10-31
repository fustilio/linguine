import log from 'loglevel';
import { COLORS } from './const.js';
import type { ColorType } from './types.js';

// Configure loglevel
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
  log.setLevel('warn');
} else {
  log.setLevel('debug');
}

// Color mapping for backward compatibility
const colorMap: Record<ColorType, string> = {
  success: COLORS.FgGreen,
  info: COLORS.FgBlue,
  error: COLORS.FgRed,
  warning: COLORS.FgYellow,
  ...COLORS,
};

/**
 * Colorful log function for backward compatibility
 */
export const colorfulLog = (message: string, type: ColorType = 'info'): void => {
  const color = colorMap[type] || COLORS.FgWhite;
  const logMethod = type === 'error' ? log.error : type === 'warning' ? log.warn : type === 'success' ? log.info : log.debug;
  
  logMethod(color + message + COLORS.Reset);
};

/**
 * Export loglevel instance for direct use
 */
export { log };
export default log;

