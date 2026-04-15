const crypto = require('crypto');

const algorithm = 'aes-256-gcm';

const deriveKey = raw => crypto.createHash('sha256').update(raw).digest();

const resolveEncryptionKeyCandidates = () => {
  const candidates = [
    process.env.ENCRYPTION_KEY,
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_SECRET
  ].filter(Boolean);

  const unique = [...new Set(candidates)];

  if (!unique.length) {
    throw new Error('ENCRYPTION_KEY is required for MFA secret encryption');
  }

  return unique.map(deriveKey);
};

const resolveEncryptionKey = () => {
  const keys = resolveEncryptionKeyCandidates();

  return keys[0];
};

const encrypt = value => {
  if (!value) {
    return null;
  }

  const key = resolveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = payload => {
  if (!payload) {
    return null;
  }

  const [ivHex, authTagHex, encryptedHex] = payload.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Encrypted payload format is invalid');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const keys = resolveEncryptionKeyCandidates();

  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (err) {
      // Continue with fallback keys for backward compatibility.
    }
  }

  throw new Error('Unable to decrypt payload with configured keys');
};

module.exports = {
  encrypt,
  decrypt
};