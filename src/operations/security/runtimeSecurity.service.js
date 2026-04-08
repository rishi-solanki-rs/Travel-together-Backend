import crypto from 'node:crypto';
import net from 'node:net';
import env from '../../config/env.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const buildDeviceFingerprint = ({ userAgent = '', acceptLanguage = '', ipAddress = '' }) => {
  const stable = `${userAgent}|${acceptLanguage}|${ipAddress}`;
  return {
    deviceId: sha256(stable).slice(0, 32),
    fingerprintHash: sha256(stable),
  };
};

const isPrivateIp = (host) => {
  if (!net.isIP(host)) return false;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('127.')) return true;
  if (host.startsWith('169.254.')) return true;
  if (host.startsWith('172.')) {
    const second = Number(host.split('.')[1] || 0);
    return second >= 16 && second <= 31;
  }
  return host === '::1';
};

const validateOutboundUrl = (urlValue, { allowPrivate = false } = {}) => {
  const parsed = new URL(urlValue);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('Unsupported URL protocol');
  }

  const host = (parsed.hostname || '').toLowerCase();
  if (!allowPrivate && (LOCAL_HOSTS.has(host) || isPrivateIp(host))) {
    throw new Error('Outbound URL points to private address space');
  }

  const allowlist = String(env.OUTBOUND_WEBHOOK_ALLOWLIST || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  if (allowlist.length) {
    const allowed = allowlist.some((item) => host === item || host.endsWith(`.${item}`));
    if (!allowed) {
      throw new Error('Outbound URL host is not in allowlist');
    }
  }

  return parsed.toString();
};

const sanitizeSecrets = (input) => {
  const text = JSON.stringify(input);
  const patterns = [
    /sk_live_[A-Za-z0-9]{16,}/g,
    /AKIA[0-9A-Z]{16}/g,
    /(Bearer\s+[A-Za-z0-9\-_.=]{20,})/gi,
    /(password\s*[:=]\s*[^,}\]]+)/gi,
  ];

  let output = text;
  for (const pattern of patterns) {
    output = output.replace(pattern, '[REDACTED_SECRET]');
  }
  return JSON.parse(output);
};

const encryptText = (plainText) => {
  const key = crypto.createHash('sha256').update(String(env.DLQ_ENCRYPTION_KEY || env.JWT_REFRESH_SECRET)).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptText = (cipherText) => {
  const [ivHex, encHex] = String(cipherText).split(':');
  const key = crypto.createHash('sha256').update(String(env.DLQ_ENCRYPTION_KEY || env.JWT_REFRESH_SECRET)).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

const maskPII = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => maskPII(item));
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (lower.includes('email')) {
      out[key] = typeof value === 'string' ? value.replace(/(^.).*(@.*$)/, '$1***$2') : '[MASKED]';
      continue;
    }
    if (lower.includes('phone') || lower.includes('mobile')) {
      out[key] = typeof value === 'string' ? value.replace(/.(?=.{2})/g, '*') : '[MASKED]';
      continue;
    }
    if (lower.includes('passport') || lower.includes('idnumber') || lower.includes('address')) {
      out[key] = '[MASKED]';
      continue;
    }
    out[key] = maskPII(value);
  }
  return out;
};

const detectBotSpike = ({ requestCount, uniqueIps, threshold = Number(env.BOT_SPIKE_THRESHOLD || 200) }) => {
  if (requestCount < threshold) return false;
  return uniqueIps < Math.max(5, Math.floor(requestCount * 0.1));
};

const verifyMimeMagic = (buffer, mimetype) => {
  if (!buffer || buffer.length < 12) return false;
  const sig = buffer.subarray(0, 12).toString('hex').toLowerCase();
  const signatures = {
    'image/jpeg': ['ffd8ff'],
    'image/png': ['89504e470d0a1a0a'],
    'image/gif': ['47494638'],
    'image/webp': ['52494646'],
    'image/avif': ['000000'],
  };
  const allowed = signatures[mimetype] || [];
  return allowed.some((prefix) => sig.startsWith(prefix));
};

const malwareScanHook = async ({ filePath, originalname }) => {
  const blocked = String(env.MALWARE_BLOCK_PATTERNS || 'eicar,test-malware').split(',').map((v) => v.trim()).filter(Boolean);
  const lower = `${filePath || ''} ${originalname || ''}`.toLowerCase();
  return !blocked.some((needle) => lower.includes(needle.toLowerCase()));
};

export {
  sha256,
  buildDeviceFingerprint,
  validateOutboundUrl,
  sanitizeSecrets,
  encryptText,
  decryptText,
  maskPII,
  detectBotSpike,
  verifyMimeMagic,
  malwareScanHook,
};
