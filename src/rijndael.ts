import crypto from 'crypto';

function padKey(key: string): Buffer {
  // Rellenar o truncar a 32 bytes ASCII
  let k = key;
  if (k.length > 32) k = k.substring(0, 32);
  else if (k.length < 32) k = k + 'X'.repeat(32 - k.length);
  return Buffer.from(k, 'ascii');
}

function padIV(iv: string): Buffer {
  // Rellenar o truncar a 16 bytes ASCII
  let v = iv;
  if (v.length > 16) v = v.substring(0, 16);
  else if (v.length < 16) v = v + 'X'.repeat(16 - v.length);
  return Buffer.from(v, 'ascii');
}

function padDataZeros(data: Buffer): Buffer {
  // Rellenar a múltiplo de 16 bytes con ceros
  const block = 16;
  const padLen = block - (data.length % block);
  if (padLen === 0) return data;
  return Buffer.concat([data, Buffer.alloc(padLen, 0)]);
}

function unpadZeros(str: string): string {
  // Quitar ceros finales (\0)
  return str.replace(/\x00+$/g, '');
}

export function encryptRijndael128CBC(key: string, iv: string, data: string): string {
  const keyBuf = padKey(key);
  const ivBuf = padIV(iv);
  const dataBuf = padDataZeros(Buffer.from(data, 'ascii'));
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, ivBuf);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(dataBuf), cipher.final()]);
  return encrypted.toString('base64');
}

export function decryptRijndael128CBC(key: string, iv: string, encrypted: string): string {
  const keyBuf = padKey(key);
  const ivBuf = padIV(iv);
  const encryptedBuf = Buffer.from(encrypted, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuf, ivBuf);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
  return unpadZeros(decrypted.toString('ascii'));
}
