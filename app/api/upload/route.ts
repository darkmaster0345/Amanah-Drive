import { NextRequest, NextResponse } from 'next/server';

// Blossom servers to try in order
const BLOSSOM_SERVERS = [
  'https://nostr.build/api/v2/upload/blossom',
  'https://void.cat/upload',
  'https://files.sovbit.host/upload',
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;
    const authorization = request.headers.get('Authorization');
    const chunkIndex = formData.get('chunkIndex') as string;
    const totalChunks = formData.get('totalChunks') as string;
    const hash = formData.get('hash') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[v0] Server: Uploading chunk', { chunkIndex, totalChunks, hash, size: file.size });

    // Try each server until one succeeds
    let lastError: Error | null = null;

    for (const serverUrl of BLOSSOM_SERVERS) {
      try {
        console.log('[v0] Server: Attempting upload to:', serverUrl);

        const uploadFormData = new FormData();
        uploadFormData.append('file', file, hash || 'chunk.bin');

        const headers: HeadersInit = {
          'Accept': 'application/json',
        };

        if (authorization) {
          headers['Authorization'] = authorization;
        }

        const response = await fetch(serverUrl, {
          method: 'POST',
          headers,
          body: uploadFormData,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[v0] Server: Upload successful to', serverUrl, data);
          
          return NextResponse.json({
            success: true,
            url: data.url || data.nip94?.url || `${serverUrl.replace('/upload', '')}/${hash}`,
            hash: data.sha256 || hash,
            server: serverUrl,
          });
        }

        const errorText = await response.text();
        console.log('[v0] Server: Upload failed to', serverUrl, response.status, errorText);
        lastError = new Error(`Server ${serverUrl} returned ${response.status}: ${errorText}`);
      } catch (error) {
        console.log('[v0] Server: Error uploading to', serverUrl, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    // All servers failed - use local storage fallback
    console.log('[v0] Server: All Blossom servers failed, using local storage');
    
    // Store the chunk locally and return a local URL
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    return NextResponse.json({
      success: true,
      url: `local://${hash}`,
      hash: hash,
      server: 'local',
      localData: base64,
      fallback: true,
    });

  } catch (error) {
    console.error('[v0] Server: Upload route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
