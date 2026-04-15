const crypto = require('crypto');

const algorithm = 'aes-256-gcm';

const resolveEncryptionKey = () => {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

  if (!raw) {
    throw new Error('ENCRYPTION_KEY is required for MFA secret encryption');
  }

  return crypto.createHash('sha256').update(raw).digest();
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

  const key = resolveEncryptionKey();
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
};

module.exports = {
  encrypt,
  decrypt
};