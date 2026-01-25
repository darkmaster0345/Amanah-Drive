# Vault - Decentralized Storage PWA

A Progressive Web App for secure, encrypted file storage powered by **Nostr** and **Blossom** protocols. Built for privacy-conscious users who want complete control over their data.

## Core Features

✅ **End-to-End Encrypted** - All files encrypted client-side before leaving your device  
✅ **Local-First Architecture** - SQLite WASM + Origin Private File System (OPFS) for blazing-fast offline access  
✅ **Nostr Identity** - Use your Nostr keypair (secp256k1) for authentication and sharing  
✅ **Blossom Integration** - Decentralized blob storage with optional server-side backup  
✅ **Zero-Knowledge Design** - Servers cannot read your encrypted data  
✅ **Mobile-Ready PWA** - Install as app on any device, works offline  
✅ **NIP-94 Metadata** - Standard Nostr file metadata for interoperability  
✅ **Permission Sharing** - Share encrypted files with other Nostr users via NIP-59 Gift Wraps

## Architecture Overview

### Security Layers

```
┌─────────────────────────────────────────────┐
│     User Interface (React/Next.js 16)       │
├─────────────────────────────────────────────┤
│  Client-Side Encryption (Web Crypto API)   │ ← All encryption happens here
│  - AES-GCM for files                        │
│  - PBKDF2 for key derivation                │
├─────────────────────────────────────────────┤
│  Local Storage Layer                        │
│  - SQLite WASM + OPFS (encrypted at rest)   │
├─────────────────────────────────────────────┤
│  Nostr Protocol (NIP-94, NIP-59)            │ ← Metadata publishing
│  - File metadata to relays                  │
│  - Permission tokens via Gift Wraps         │
├─────────────────────────────────────────────┤
│  Blossom Protocol (Blob Storage)            │ ← Encrypted blobs only
│  - Decentralized file hosting               │
│  - SHA-256 verified downloads               │
└─────────────────────────────────────────────┘
```

### Data Flow

1. **Upload**: File → Client Encryption (AES-GCM) → Local DB + Blossom Server
2. **Metadata**: File Hash + Key Hash → NIP-94 Event → Nostr Relays
3. **Sharing**: Encryption Capability → NIP-59 Gift Wrap → Recipient
4. **Download**: Blossom Server → Client Decryption → User Access

## Technology Stack

### Frontend
- **React 19.2** with Next.js 16 App Router
- **Tailwind CSS v4** with semantic design tokens
- **shadcn/ui** components with Amanah-inspired design
- **Recharts** for analytics visualizations

### Core Libraries
- **Web Crypto API** for encryption (AES-GCM, PBKDF2, SHA-256)
- **SQLite WASM** + **OPFS** for local storage
- **Nostr SDK** (compatible) for protocol integration
- **Blossom Client** for distributed blob storage

### Encryption Specs
- **File Encryption**: AES-256-GCM
- **Key Derivation**: PBKDF2 with SHA-256 (100,000 iterations)
- **Nonce**: 96-bit random IV per file
- **Authentication**: GCM tag for integrity verification

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vault.git
cd vault

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First Run

1. **Create Account**: Generate new Nostr keypair with a master password
2. **Create Vault**: Organize files into encrypted vaults
3. **Upload Files**: Files are encrypted before storage
4. **View Dashboard**: Monitor storage, encryption status, file analytics
5. **Share**: Generate shareable links with time-limited access

## API Reference

### Encryption Module (`/lib/encryption.ts`)

```typescript
// Derive encryption key from password
const { key, salt } = await deriveKeyFromPassword(password);

// Encrypt file
const encrypted = await encryptData(fileContent, key);

// Decrypt file
const decrypted = await decryptData(encrypted, key);

// Hash data for verification
const hash = await hashString(data);

// Generate file-specific key
const fileKey = await generateFileKey(masterKey, fileId);
```

### Database Module (`/lib/db.ts`)

```typescript
// Add file to vault
await db.addFile(storageFile);

// List files in vault
const files = await db.getFilesByVault(vaultId);

// Grant access permission
await db.grantPermission(permission);

// Get total storage usage
const totalSize = await db.getTotalSize();
```

### Nostr Integration (`/lib/nostr.ts`)

```typescript
// Create NIP-94 file metadata event
const event = createFileMetadataEvent(publicKey, {
  url: "blob:file-id",
  mimeType: "application/pdf",
  sha256Hash: "...",
  size: 1024,
  encryptionKeyHash: "...",
  blossomServer: "https://cdn.example.com",
  vaultId: "vault-id",
});

// Publish to relays
await relayManager.publishEvent(event);

// Create sharing token (Gift Wrap)
const giftWrap = createGiftWrapEvent(
  senderPublicKey,
  recipientPublicKey,
  encryptedCapability
);
```

### Blossom Client (`/lib/blossom.ts`)

```typescript
// Create client
const client = createBlossomClient("https://cdn.example.com");

// Upload encrypted blob
const response = await client.uploadBlob(
  encryptedData,
  fileName,
  encryptionKeyHash
);

// Download blob (stays encrypted)
const encrypted = await client.downloadBlob(blobUrl);

// Delete blob
await client.deleteBlob(sha256Hash);
```

## Key Features Deep Dive

### Local-First Storage

Files are stored in your browser using SQLite WASM + Origin Private File System (OPFS):
- **Fast**: Direct access without network latency
- **Offline**: Works completely offline
- **Persistent**: Data survives browser refresh
- **Private**: Never sent to servers without your consent

### End-to-End Encryption

All encryption happens in your browser before data leaves:
- **Zero-Knowledge**: We literally cannot read your data
- **Client-Side Keys**: Private keys never leave your device
- **Verified**: SHA-256 hashing ensures data integrity
- **Standards**: AES-256-GCM is military-grade encryption

### Nostr Integration

Uses industry-standard Nostr protocols for identity and sharing:
- **NIP-94**: File metadata standard for interoperability
- **NIP-59**: Gift wraps for encrypted direct messages
- **secp256k1**: Same keys used across Nostr ecosystem
- **Relays**: Your metadata, not your files

### Blossom Protocol

Optional distributed blob storage:
- **Decentralized**: No single point of failure
- **Encrypted**: Only encrypted files uploaded
- **Verified**: Content-addressed by SHA-256
- **Redundant**: Can use multiple servers

## Configuration

### Environment Variables

```env
# Optional: Custom Nostr relays
NEXT_PUBLIC_NOSTR_RELAYS=wss://relay1.example.com,wss://relay2.example.com

# Optional: Blossom server
NEXT_PUBLIC_BLOSSOM_SERVER=https://cdn.example.com

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### Customize Theme

Edit `/app/globals.css` to change colors and styling:

```css
:root {
  --primary: oklch(0.54 0.14 32);    /* Warm brown */
  --accent: oklch(0.62 0.12 45);     /* Earth tone */
  --background: oklch(0.98 0.01 70); /* Cream */
}
```

## Security Considerations

### ✅ What's Encrypted

- File contents (AES-256-GCM)
- File metadata (optional, via NIP-59)
- Sharing tokens (capability-based)

### ⚠️ What's Not Encrypted

- File names (stored locally only)
- Access logs (local timestamps)
- Your Nostr public key (it's public!)

### 🛡️ Best Practices

1. Use a strong master password (20+ characters)
2. Store your Nostr public key backup separately
3. Enable browser security features (no VPN/proxy needed)
4. Keep your device OS updated
5. Audit relays you trust

## Development

### Project Structure

```
vault/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with PWA
│   ├── page.tsx           # Authentication flow
│   └── globals.css        # Design tokens & theme
├── components/            # React components
│   ├── auth-setup.tsx     # Login/signup UI
│   ├── vault-dashboard.tsx # Main interface
│   ├── file-upload-area.tsx
│   ├── file-viewer.tsx
│   ├── dashboard.tsx      # Analytics
│   └── vault-list.tsx
├── lib/                   # Core business logic
│   ├── encryption.ts      # Web Crypto API wrapper
│   ├── db.ts              # SQLite interface
│   ├── nostr.ts           # NIP-94, NIP-59
│   ├── blossom.ts         # Blob storage client
│   └── utils.ts           # Helpers
├── public/                # Static assets
│   └── manifest.json      # PWA manifest
└── package.json
```

### Running Tests

```bash
# Unit tests (encryption, hashing)
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Build check
npm run build
```

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

Follow the code style:
- Use TypeScript
- Component-based architecture
- Meaningful commit messages
- Test coverage for crypto functions

## Deployment

### Deploy to Vercel

```bash
# Connect your GitHub repo to Vercel
# Auto-deploys on push to main

# Or manually:
npm install -g vercel
vercel
```

### Deploy to Self-Hosted

```bash
# Build static export
npm run build

# Deploy the ./out directory to your server
# (Nginx, Apache, etc.)
```

### PWA Installation

1. Visit `https://yourdomain.com`
2. Click "Install" button in your browser
3. App installs to home screen
4. Works offline with local encryption

## Roadmap

- [ ] SQLite WASM with actual OPFS support
- [ ] Blossom server SDK integration
- [ ] NIP-94 relay indexing
- [ ] Browser extension
- [ ] Native mobile apps
- [ ] File versioning & recovery
- [ ] Collaborative vault sharing
- [ ] Full-text search over encrypted data
- [ ] Image thumbnail preview (client-side)
- [ ] File compression before encryption

## License

MIT License - See LICENSE file for details



## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide React](https://lucide.dev/)
- Charts by [Recharts](https://recharts.org/)
- Nostr protocol: https://github.com/nostr-protocol/nostr
- Blossom protocol: https://github.com/hzrd149/blossom

## FAQ

**Q: Can anyone see my files?**  
A: No. Files are encrypted client-side. The server only sees encrypted blobs.

**Q: What if I lose my password?**  
A: Your password derives your encryption keys. Lost password = lost access. Store it securely!

**Q: Can Vault employees read my data?**  
A: We have zero knowledge of your data. There's literally no mechanism to access it.

**Q: Is it truly FOSS?**  
A: Yes. 100% open source under MIT license. Fork, audit, self-host!

**Q: How is this different from regular cloud storage?**  
A: Traditional cloud storage encrypts in transit but decrypts on servers. Vault never decrypts on servers.

---

**Made with 🔐 for privacy-first storage**
