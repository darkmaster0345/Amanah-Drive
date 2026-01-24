/**
 * Creates an inlined Web Worker using Blob
 * Avoids MIME type and deployment issues
 */

const workerCode = `
/**
 * Web Worker for client-side encryption
 * Runs encryption off the main thread to prevent UI freezing
 */

async function deriveKeyFromPassword(password, salt) {
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

async function encryptData(data, key, iv) {
  if (!iv) {
    iv = crypto.getRandomValues(new Uint8Array(12));
  }

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );

  const btoa = (data) => {
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

async function decryptData(encrypted, key) {
  const atob = (data) => {
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

self.onmessage = async (event) => {
  const task = event.data;

  try {
    let result;

    if (task.type === 'encrypt') {
      if (!task.data || !(task.data instanceof Uint8Array)) {
        throw new Error('Invalid data for encryption');
      }
      if (!task.key) {
        throw new Error('No key provided for encryption');
      }
      result = await encryptData(task.data, task.key, task.iv);
    } else if (task.type === 'decrypt') {
      if (!task.data) {
        throw new Error('No data provided for decryption');
      }
      if (!task.key) {
        throw new Error('No key provided for decryption');
      }
      
      if (task.data instanceof ArrayBuffer || ArrayBuffer.isView(task.data)) {
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: task.iv || new Uint8Array(12) },
          task.key,
          task.data instanceof ArrayBuffer ? task.data : new Uint8Array(task.data)
        );
        result = new Uint8Array(decrypted);
      } else {
        result = await decryptData(task.data, task.key);
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
        key: 'key-object',
        salt: Array.from(salt)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(''),
      };
    } else {
      throw new Error('Unknown task type');
    }

    const response = {
      id: task.id,
      success: true,
      result,
    };

    self.postMessage(response);
  } catch (error) {
    const response = {
      id: task.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    self.postMessage(response);
  }
};
`;

/**
 * Create an inlined Web Worker from the worker code
 */
export function createEncryptionWorker(): Worker {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  return new Worker(workerUrl);
}

/**
 * Dispatch a task to the worker and wait for response
 */
export function dispatchWorkerTask(
  worker: Worker,
  task: { id: string; type: string; [key: string]: any }
): Promise<{ success: boolean; result?: any; error?: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Worker task timeout'));
    }, 30000); // 30 second timeout

    const handleMessage = (event: MessageEvent) => {
      if (event.data.id === task.id) {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        resolve(event.data);
      }
    };

    const handleError = (error: ErrorEvent) => {
      clearTimeout(timeout);
      worker.removeEventListener('error', handleError);
      reject(error);
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage(task);
  });
}
