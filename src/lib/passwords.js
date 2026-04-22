const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');
  const candidateBuffer = Buffer.from(candidateHash, 'hex');
  if (originalBuffer.length !== candidateBuffer.length) return false;
  return crypto.timingSafeEqual(originalBuffer, candidateBuffer);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
