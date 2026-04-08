const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'cardNumber', 'cvv', 'upi', 'bankAccount'];

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const redactObject = (input, redactedFields = [], prefix = '') => {
  if (Array.isArray(input)) {
    return input.map((entry, index) => redactObject(entry, redactedFields, `${prefix}[${index}]`));
  }

  if (!isObject(input)) return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      out[key] = '[REDACTED]';
      redactedFields.push(path);
      continue;
    }
    out[key] = redactObject(value, redactedFields, path);
  }
  return out;
};

const redactForAudit = (payload) => {
  const redactedFields = [];
  const output = redactObject(payload, redactedFields);
  return { output, redactedFields };
};

const buildDiffFields = (before = {}, after = {}) => {
  const fields = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return Array.from(fields).filter((field) => JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field]));
};

export { redactForAudit, buildDiffFields };
