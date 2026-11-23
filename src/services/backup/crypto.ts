/**
 * SmartMoney Cryptographic Engine
 *
 * Implements standard AES-256-GCM encryption with PBKDF2 (SHA-256)
 * key derivation for secure backups and exports.
 * Powered by standard Web Crypto API (crypto.subtle).
 */

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0);
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const CryptoEngine = {
  /**
   * Derives a 256-bit AES key from a password using PBKDF2-SHA256.
   */
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypts plaintext string using AES-256-GCM.
   */
  async encrypt(
    plaintext: string,
    password: string
  ): Promise<{ saltHex: string; ivHex: string; ciphertextBase64: string }> {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);

    const iv = new Uint8Array(12); // Standard 96-bit IV for AES-GCM
    crypto.getRandomValues(iv);

    const key = await this.deriveKey(password, salt);
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as any,
      },
      key,
      encoded
    );

    return {
      saltHex: bufferToHex(salt),
      ivHex: bufferToHex(iv),
      ciphertextBase64: bufferToBase64(ciphertextBuffer),
    };
  },

  /**
   * Decrypts ciphertext using AES-256-GCM.
   * Throws an error immediately if the password is wrong or ciphertext is modified.
   */
  async decrypt(
    ciphertextBase64: string,
    password: string,
    saltHex: string,
    ivHex: string
  ): Promise<string> {
    const salt = hexToUint8Array(saltHex);
    const iv = hexToUint8Array(ivHex);
    const ciphertext = base64ToUint8Array(ciphertextBase64);

    const key = await this.deriveKey(password, salt);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv as any,
        },
        key,
        ciphertext as any
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
      throw new Error('Decryption failed: Incorrect password or corrupted backup file.');
    }
  },
};

