/**
 * Web Worker for client-side encryption
 * Runs encryption off the main thread to prevent UI freezing
 */

interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

interface EncryptionTask {
  type: 'encrypt' | 'decrypt' | 'derive';
  id: string;
  data?: Uint8Array | EncryptedData | ArrayBuffer;
  key?: CryptoKey | string;
  password?: string;
  iv?: Uint8Array;
}

interface EncryptionResult {
  id: string;
  success: boolean;
  result?: EncryptedData | Uint8Array | { key: string; salt: string };
  error?: string;
}

/**
 * Derive a key from password using PBKDF2
 */
async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt };
}

/**
 * Encrypt data using AES-GCM
 */
async function encryptData(
  data: Uint8Array,
  key: CryptoKey,
  iv?: Uint8Array
): Promise<EncryptedData> {
  if (!iv) {
    iv = crypto.getRandomValues(new Uint8Array(12));
  }

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );

  const btoa = (data: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return globalThis.btoa(binary);
  };

  return {
    ciphertext: btoa(new Uint8Array(encryptedData)),
    iv: btoa(iv),
    salt: '',
  };
}

/**
 * Decrypt data using AES-GCM
 */
async function decryptData(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<Uint8Array> {
  const atob = (data: string): Uint8Array => {
    const binary = globalThis.atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const ciphertext = atob(encrypted.ciphertext);
  const iv = atob(encrypted.iv);

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );

  return new Uint8Array(decryptedData);
}

/**
 * Message handler for encryption tasks
 */
self.onmessage = async (event: MessageEvent<EncryptionTask>) => {
  const task = event.data;

  try {
    let result: EncryptedData | Uint8Array | { key: string; salt: string };

    if (task.type === 'encrypt') {
      if (!task.data || !(task.data instanceof Uint8Array)) {
        throw new Error('Invalid data for encryption');
      }
      if (!task.key) {
        throw new Error('No key provided for encryption');
      }
      result = await encryptData(task.data, task.key as any, task.iv);
    } else if (task.type === 'decrypt') {
      // Handle both EncryptedData objects and raw ArrayBuffer data
      if (!task.data) {
        throw new Error('No data provided for decryption');
      }
      if (!task.key) {
        throw new Error('No key provided for decryption');
      }
      
      // If data is an ArrayBuffer, decrypt it directly using the IV
      if (task.data instanceof ArrayBuffer || ArrayBuffer.isView(task.data)) {
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: task.iv || new Uint8Array(12) },
          task.key as CryptoKey,
          task.data instanceof ArrayBuffer ? task.data : new Uint8Array(task.data)
        );
        result = new Uint8Array(decrypted);
      } else {
        // Otherwise treat as EncryptedData object
        result = await decryptData(task.data as any, task.key as any);
      }
    } else if (task.type === 'derive') {
      if (!task.password) {
        throw new Error('No password provided');
      }
      const { key, salt } = await deriveKeyFromPassword(
        task.password,
        task.salt
      );
      result = {
        key: 'key-object', // CryptoKey cannot be transferred
        salt: Array.from(salt)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
      };
    } else {
      throw new Error('Unknown task type');
    }

    const response: EncryptionResult = {
      id: task.id,
      success: true,
      result,
    };

    self.postMessage(response);
  } catch (error) {
    const response: EncryptionResult = {
      id: task.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    self.postMessage(response);
  }
};
