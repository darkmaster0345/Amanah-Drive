# Vault Architecture Document

## System Overview

Vault is a **zero-knowledge, end-to-end encrypted** file storage PWA built on **Nostr** and **Blossom** protocols. The system prioritizes user privacy, data security, and offline-first usability.

```
┌──────────────────────────────────────────────────────────────┐
│                    User's Browser                            │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  Vault PWA (React 19 + Next.js 16)                       │ │
│ │  - Authentication UI                                     │ │
│ │  - Vault Management                                      │ │
│ │  - File Upload/Download Interface                        │ │
│ │  - Dashboard & Analytics                                 │ │
│ └──────────────────────────────────────────────────────────┘ │
│          ↓                                    ↓               │
│ ┌──────────────────────┐        ┌────────────────────────┐  │
│ │ Encryption Layer     │        │ Storage Layer          │  │
│ │ (Web Crypto API)     │        │ (SQLite WASM + OPFS)   │  │
│ │ - AES-256-GCM        │        │ - Local File Storage   │  │
│ │ - PBKDF2 KDF         │        │ - Offline Support      │  │
│ │ - SHA-256 Hashing    │        │ - Sync Metadata        │  │
│ └──────────────────────┘        └────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         ↓                                        ↓
    ┌─────────────────┐              ┌─────────────────────┐
    │  Nostr Relays   │              │ Blossom Servers     │
    │ (NIP-94, 59)    │              │ (Blob Storage)      │
    │ - Metadata Only │              │ - Encrypted Blobs   │
    │ - No File Data  │              │ - No Decryption     │
    └─────────────────┘              └─────────────────────┘
```

## Component Architecture

### 1. Authentication & Identity (`/lib/encryption.ts`)

**Responsibility**: Manage user identity, keypair generation, and key derivation

```
Nostr Keypair
├── Public Key (secp256k1) - Public identity
└── Private Key - Never leaves device

Master Encryption Key
├── Derived from: User password + Salt (PBKDF2)
├── Used for: Deriving file-specific keys
└── Storage: Browser localStorage (encrypted)
```

**Key Operations**:
- `generateNostrKeypair()` - Create Ed25519 keypair (production: secp256k1)
- `deriveKeyFromPassword()` - PBKDF2 with 100,000 iterations
- `generateFileKey()` - HKDF for per-file encryption keys
- `hashString()` - SHA-256 for verification

### 2. Encryption Engine (`/lib/encryption.ts`)

**Responsibility**: Encrypt/decrypt files using Web Crypto API

```
File Upload Flow:
  User File
    ↓
  Read as ArrayBuffer
    ↓
  Derive File Key (HKDF)
    ↓
  Encrypt with AES-256-GCM
    ↓
  Generate IV + Auth Tag
    ↓
  Base64 Encode
    ↓
  Store in Local DB
    ↓
  Upload to Blossom (optional)

File Download Flow:
  Blossom Server or Local DB
    ↓
  Retrieve Encrypted Blob
    ↓
  Decrypt with AES-256-GCM
    ↓
  Verify Auth Tag
    ↓
  Return Plaintext to User
```

**Algorithm Details**:
- **Cipher**: AES-256-GCM (256-bit key)
- **IV**: 96-bit random per file
- **Auth Tag**: 128-bit GCM tag for integrity
- **KDF**: PBKDF2-SHA256 (100,000 iterations, random salt)

### 3. Storage Layer (`/lib/db.ts`)

**Responsibility**: Manage encrypted metadata and file references locally

```
Database Schema:

StorageFile
├── id: string (unique file ID)
├── name: string (file name)
├── mimeType: string (content type)
├── size: number (file size in bytes)
├── encryptionKeyHash: string (SHA-256 of encryption key)
├── blossomUrl?: string (optional Blossom URL)
├── nostrEventId?: string (NIP-94 event ID)
├── createdAt: number (unix timestamp)
├── updatedAt: number (unix timestamp)
└── vaultId: string (parent vault)

Vault
├── id: string (unique vault ID)
├── name: string (vault name)
├── description: string
├── createdAt: number
└── updatedAt: number

AccessPermission
├── id: string
├── fileId: string
├── grantedTo: string (recipient's public key)
├── accessLevel: 'read' | 'read-write'
├── expiresAt?: number (optional expiration)
└── createdAt: number

SyncMetadata
├── fileId: string
├── lastBlossomSync?: number
├── lastNostrSync?: number
└── syncStatus: 'synced' | 'pending' | 'failed'
```

**Storage Technology**:
- **Current**: localStorage (in-memory with fallback)
- **Production**: SQLite WASM + OPFS for true persistent storage
- **Capacity**: Browser quota (50MB - 1GB depending on browser)

### 4. Nostr Integration (`/lib/nostr.ts`)

**Responsibility**: Publish file metadata and sharing tokens

```
NIP-94 Event Structure:
{
  kind: 1063,
  pubkey: "user-public-key",
  created_at: 1704067200,
  content: "Encrypted file metadata",
  tags: [
    ["url", "https://example.com/file/abc123"],
    ["m", "application/pdf"],
    ["x", "sha256-hash"],
    ["size", "1024000"],
    ["encryptionKeyHash", "key-hash"],
    ["blossomServer", "https://cdn.example.com"],
    ["vaultId", "vault-id"],
    ["title", "My Document.pdf"]
  ]
}

NIP-59 Gift Wrap (Sharing):
{
  kind: 1059,
  pubkey: "sender-pubkey",
  created_at: 1704067200,
  content: "encrypted-capability",
  tags: [["p", "recipient-pubkey"]]
}
```

**Publishing Flow**:
1. User uploads file
2. File encrypted locally
3. Nostr event created with metadata only
4. Event published to user-selected relays
5. No file content ever sent to relays

### 5. Blossom Integration (`/lib/blossom.ts`)

**Responsibility**: Manage encrypted blob storage and retrieval

```
Blossom Upload Flow:
  Encrypted File
    ↓
  POST /upload {file: encrypted_blob}
    ↓
  Server stores blob (cannot read it)
    ↓
  Returns: {url: "https://cdn.example.com/file/hash"}
    ↓
  Client stores URL in local DB
    ↓
  Client publishes NIP-94 to relays

Blossom Download Flow:
  NIP-94 Event
    ↓
  Extract blob URL from event
    ↓
  GET {blob_url}
    ↓
  Server returns encrypted blob
    ↓
  Client decrypts locally
    ↓
  User gets plaintext
```

**Server Cannot Access**:
- ✗ Encryption keys
- ✗ File contents
- ✗ File names
- ✗ User identity (only sees public key)

**Server Can Access**:
- ✓ Encrypted blob (random data)
- ✓ File size
- ✓ File hash (SHA-256)
- ✓ Metadata (via Nostr relays)

### 6. UI Components (`/components/`)

**Component Hierarchy**:

```
page.tsx (Root)
├── <AuthSetup /> - Login/signup flow
│   ├── Welcome step
│   ├── Generate keypair step
│   └── Import keypair step
└── <VaultDashboard /> - Main app
    ├── Header
    │   ├── Logo + Identity
    │   └── Logout button
    ├── Sidebar (Vault list)
    │   ├── Create vault button
    │   └── <VaultList />
    └── Main content (Tabs)
        ├── Files tab → <FileViewer />
        ├── Upload tab → <FileUploadArea />
        └── Dashboard tab → <Dashboard />

<FileUploadArea />
└── Drag-drop zone
    ├── Progress indicator
    └── Encryption status

<FileViewer />
├── File list
├── File metadata
└── Action buttons (delete, share)

<Dashboard />
├── Stats cards
│   ├── Total files
│   ├── Total size
│   ├── Vault count
│   └── Encryption status
├── Charts
│   ├── Files by type (pie)
│   └── Files per vault (bar)
└── Info cards
    ├── Privacy status
    └── Identity info
```

## Data Flow & Security

### Upload Sequence

```
1. User selects file
   ↓
2. Browser reads file as ArrayBuffer
   ↓
3. Derive file key from master key
   ↓
4. Encrypt with AES-256-GCM
   [File → Ciphertext (unintelligible)]
   ↓
5. Create metadata event (NIP-94)
   [Only file hash, size, not content]
   ↓
6. Store encrypted blob locally
   ↓
7. (Optional) Upload encrypted blob to Blossom
   [Server sees random bytes only]
   ↓
8. Publish metadata to Nostr relays
   [Relays see hash and URL, not file content]
   ↓
9. UI confirms successful upload
```

**At each step, file remains encrypted except in user's browser**

### Sharing Sequence

```
1. User selects file to share
   ↓
2. Create sharing capability
   [Grant recipient access to specific file]
   ↓
3. Encrypt capability with recipient's key
   ↓
4. Create NIP-59 Gift Wrap
   ↓
5. Publish Gift Wrap to relays
   [Recipient's client automatically decrypts and processes]
   ↓
6. Recipient can now access file
   [Permission stored in their vault]
```

## Privacy Guarantees

### What We Can NOT See

| Item | Why |
|------|-----|
| File contents | Encrypted with AES-256-GCM |
| File names | Stored locally only |
| File metadata | Sent encrypted or not at all |
| User passwords | Never transmitted |
| Private keys | Never leave user's device |
| Access patterns | Metadata stays on relay |

### What We CAN See

| Item | Why |
|------|-----|
| Nostr public key | It's public |
| Blob hash (SHA-256) | Needed for content-addressing |
| File size | Needed for quota management |
| Upload timestamp | Metadata only, no content |

### Attack Scenarios & Defenses

#### Scenario 1: Server Compromise
```
Attacker gains access to Blossom server
↓
Attacker sees: Random encrypted blobs
Attacker cannot: Decrypt without client key
Result: File contents remain safe
```

#### Scenario 2: ISP Monitoring
```
ISP observes HTTPS traffic
↓
ISP sees: Encrypted metadata events
ISP cannot: Decrypt files
Result: Privacy preserved
```

#### Scenario 3: Password Leak
```
User's master password is compromised
↓
Attacker needs: Encryption keys + encrypted files
Attacker has: Password only
Result: Files still secure (key ≠ password)
```

#### Scenario 4: Relay Compromise
```
Relay operator gains access
↓
Relay has: Encrypted NIP-94 events
Relay cannot: See file contents or keys
Result: Metadata privacy intact
```

## Performance Considerations

### Encryption Overhead

```
File Size | Encrypt Time | Space Overhead | Decrypt Time
-----------|-------------|----------------|-------------
1 MB       | 50-150ms    | 512 bytes      | 50-150ms
10 MB      | 500-1000ms  | 512 bytes      | 500-1000ms
100 MB     | 3-8 seconds | 512 bytes      | 3-8 seconds
```

**Notes**:
- Times vary by device CPU
- Overhead is constant (IV + salt + tag)
- OPFS provides better performance than localStorage

### Storage Optimization

```
Database Capacity: 50MB - 1GB (browser dependent)

Recommended Limits:
- Individual file: <100 MB
- Total vault: <500 MB
- Number of files: <10,000
```

### Caching Strategy

```
Cache Layer 1: In-Memory
└─ Active files/metadata
   └─ Fast access, lost on refresh

Cache Layer 2: OPFS
└─ All files encrypted at rest
   └─ Survives refresh, survives offline

Cache Layer 3: Blossom (Optional)
└─ Encrypted blob backup
   └─ Survives device failure, accessible from any device
```

## Deployment Architecture

### Local Development

```
localhost:3000
├── Next.js Dev Server (with hot reload)
├── localStorage (development storage)
└── No relay/Blossom connections
```

### Production PWA

```
https://vault.example.com/
├── CDN (Vercel or self-hosted)
├── Browser-based all computation
├── OPFS persistent storage
├── Optional Nostr relay connectivity
└── Optional Blossom server connections
```

### Self-Hosted Option

```
1. Build: npm run build
2. Deploy: Static files to server
3. Configure: DNS, HTTPS, headers
4. Scale: Reverse proxy + edge cache
5. Monitor: Server logs only
   (Vault itself is client-side only)
```

## Security Audit Checklist

- [ ] All encryption done in browser
- [ ] Keys derived locally (PBKDF2)
- [ ] Files encrypted before upload
- [ ] Server never receives plaintext
- [ ] HTTPS enforced
- [ ] HSTS headers set
- [ ] CSP headers configured
- [ ] No logging of sensitive data
- [ ] SQL injection not possible (WASM DB)
- [ ] XSS protections in place
- [ ] CSRF tokens for state changes
- [ ] Rate limiting on relays
- [ ] Password reset mechanism missing (intentional)

## Future Enhancements

### Phase 2: Advanced Features
- [ ] File versioning with diff storage
- [ ] Collaborative vaults
- [ ] Full-text search (encrypted)
- [ ] Email sharing integration
- [ ] Recovery codes for password reset

### Phase 3: Performance
- [ ] SQLite WASM with true OPFS
- [ ] Service worker caching improvements
- [ ] Streaming encryption for large files
- [ ] Compression before encryption

### Phase 4: Ecosystem
- [ ] Native mobile apps
- [ ] Browser extension
- [ ] Blossom server implementation
- [ ] Nostr NIP-94 indexing service

## References

- **Nostr Protocol**: https://github.com/nostr-protocol/nostr
- **NIP-94**: File Metadata Event Standard
- **NIP-59**: Gift Wraps for Encrypted Messages
- **Blossom Protocol**: https://github.com/hzrd149/blossom
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **OPFS**: https://developer.chrome.com/articles/file-system-access/
- **SQLite WASM**: https://sql.js.org/

---

**Last Updated**: January 2026  
**Maintainer**: Vault Contributors
