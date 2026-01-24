# Nostr Decentralized Storage Solution - Architectural Design

## Executive Summary

A FOSS decentralized storage application leveraging the Nostr protocol to enable users to securely store, manage, and share data with complete privacy and control. The system combines Nostr's decentralized messaging infrastructure with end-to-end encryption, distributed storage, and user-centric access management to create a trustless storage ecosystem.

---

## 1. System Overview

### 1.1 Core Principles

- **User Sovereignty**: Users retain absolute control over their data and cryptographic keys
- **Privacy by Design**: End-to-end encryption is mandatory; no plaintext data transits or rests on servers
- **Decentralization**: No single point of failure; data distributed across multiple storage nodes
- **Openness**: FOSS license ensures transparency and community audit capability
- **Nostr Integration**: Leverages existing Nostr relay infrastructure and keypair ecosystem
- **Interoperability**: Compatible with standard Nostr clients and protocols

### 1.2 Key Characteristics

| Aspect | Characteristic |
|--------|-----------------|
| **Architecture** | Peer-to-peer with relay coordination |
| **Data Encryption** | End-to-end encryption (user-controlled keys) |
| **User Authentication** | Nostr keypairs (Ed25519) |
| **Storage Model** | Distributed, redundant, user-specified |
| **Consensus** | Trust model based on cryptographic proofs |
| **Scalability** | Horizontal; limited only by relay infrastructure |
| **Cost Model** | User-pays (optional relay fees); no rent-seeking |

---

## 2. Architecture Layers

### 2.1 Layer 1: Identity & Cryptography Foundation

**Components:**
- **Keypair Management**: User's Ed25519 keypair serves as identity anchor
  - Public Key (npub): User identifier and signature verification
  - Private Key (nsec): Encryption and authentication source
  - Derived Keys: Per-file or per-vault encryption keys via HKDF or similar KDF

- **Cryptographic Operations**:
  - **Authentication**: Nostr NIP-07 (signing) for user verification
  - **Encryption**: ChaCha20-Poly1305 (AEAD) for file-level encryption
  - **Key Derivation**: HKDF-SHA256 for vault and file-specific keys
  - **Integrity Verification**: HMAC-SHA256 for tamper detection
  - **Digital Signatures**: Ed25519 for metadata and access proof signatures

**FOSS Consideration**: Use well-audited cryptography libraries (libsodium, NaCl equivalents)

---

### 2.2 Layer 2: Nostr Protocol Integration

**Components:**
- **Event Types** (NIP-23 compatible, with extensions):
  - `Kind 30023`: Long-form content (vault metadata)
  - `Kind 30024`: Encrypted file events (custom extension)
  - `Kind 20000-26000`: Application-specific file storage events
  - `Kind 10002`: Relay list metadata

- **Relay Coordination**:
  - Users specify trusted relay set for metadata distribution
  - Relays store encrypted event references (not actual files)
  - Relays validate Nostr event format but cannot access encrypted contents
  - Event metadata enables discovery and permission tracking

- **Event Structure**:
  ```
  Event {
    kind: 30024 (encrypted file reference)
    content: {encrypted_file_pointer} (ChaCha20-Poly1305)
    tags: [
      ["file_name", "encrypted_name"],
      ["file_hash", "sha256_hash"],
      ["storage_node", "node_address"],
      ["access_key_id", "key_identifier"],
      ["created_at", "timestamp"]
    ]
  }
  ```

---

### 2.3 Layer 3: Access Control & Permissions

**Components:**
- **Capability-Based Access Model**:
  - Files encrypted with owner's key; access grants share derived, scoped keys
  - Permissions are cryptographic proofs, not server-enforced rules
  - Read, Write, Share, Delete capabilities independent and revocable

- **Access Tokens**:
  - Encrypted grant containing: file_id, capability, expiration, scope
  - Signed by file owner; verified by recipient through public key
  - Time-bound; can be revoked by re-encrypting master file key

- **Share Mechanism**:
  - Owner derives limited-scope encryption key for recipient
  - Shares encrypted file pointer + access token via Nostr private message (NIP-04 or NIP-44)
  - Recipient can verify legitimacy via owner's public key signature
  - Optional expiration and usage limits encoded in token

- **Role Levels**:
  - **Owner**: Create, read, write, delete, manage permissions
  - **Editor**: Read, write, but not delete or modify permissions
  - **Viewer**: Read-only access
  - **Commenter**: Read + append metadata (audit trails)

---

### 2.4 Layer 4: Storage & Distribution

**Components:**
- **Storage Node Network**:
  - Distributed, independent storage providers (IPFS, Filecoin, or custom)
  - Users select preferred nodes or storage type
  - No single provider can access unencrypted data
  - Nodes publish their capabilities via Nostr

- **Sharding & Redundancy**:
  - Large files split into encrypted shards (e.g., 256MB chunks)
  - Reed-Solomon erasure coding: 3-of-5 or 4-of-6 schemes
  - Shards distributed across geographically diverse nodes
  - Metadata references all shard locations and integrity hashes

- **Data Durability**:
  - Cryptographic proofs of possession (challenge-response)
  - Periodic verification through DHT or relay queries
  - User notified if shard availability drops below threshold
  - Automatic re-replication to maintain redundancy

- **Storage Economics**:
  - Users can store on free/personal nodes (own infrastructure)
  - Optional paid storage via provider-specific mechanisms
  - Storage contracts recorded as Nostr events for auditability
  - No lock-in; data remains encrypted and portable

---

### 2.5 Layer 5: Client Application

**Components:**
- **Core Features**:
  - Vault creation and management (collections of encrypted files)
  - File upload/download with transparent encryption/decryption
  - Granular permission management via UI
  - Encrypted metadata search (client-side indexing)
  - Version control (immutable file history)
  - Audit logging (access events, changes)

- **User Interface**:
  - Dashboard showing storage usage, recent activity
  - File browser with encryption indicators
  - Permission manager with share links and access tokens
  - Key/wallet management interface
  - Relay configuration and health monitoring
  - Settings for encryption algorithms, redundancy levels

- **Protocols & APIs**:
  - Nostr NIP-07 or NIP-46 for key signing
  - Nostr relay protocols (WebSocket) for metadata sync
  - HTTPS/WebRTC for encrypted file transfer
  - Optional CLI tool for server-side/scripted access

---

## 3. Core Functionalities

### 3.1 Data Operations

| Operation | Flow |
|-----------|------|
| **Upload** | Client encrypts file → Splits into shards → Uploads to distributed nodes → Records metadata on Nostr relay → Returns file_id |
| **Download** | Client queries Nostr for file metadata → Retrieves shards from nodes → Reconstructs file → Decrypts using private key → Delivers to user |
| **Delete** | Client invalidates encryption key → Publishes revocation event on relay → Requests deletion from storage nodes → Marks as inaccessible |
| **Share** | Owner derives scoped encryption key → Creates access token → Sends via Nostr DM → Recipient's client verifies signature and stores token → Can decrypt shared file |
| **Sync** | Client maintains local encrypted cache → Periodically queries relay for changes → Detects new/modified files → Syncs to local storage |

### 3.2 Permission Operations

| Operation | Mechanism |
|-----------|-----------|
| **Grant Access** | Owner generates capability token → Shares recipient's public key → Token encrypted to recipient → Sent via Nostr message |
| **Revoke Access** | Owner invalidates token → Publishes revocation event → Re-encrypts master file key → Old token becomes useless |
| **Modify Permissions** | Owner updates token scope → Re-transmits to recipient with new capabilities → Timestamp prevents downgrade attacks |
| **Audit Access** | Owner reviews Nostr event log → Client displays access history → Tamper-evident due to cryptographic signatures |

### 3.3 Search & Discovery

- **Client-Side Indexing**: User's client maintains encrypted search index
- **Keyword Search**: User queries encrypted metadata without exposing plaintext to relays
- **Tags & Categories**: User-defined metadata, encrypted and stored locally
- **Collaborative Filtering**: Optional, aggregated at user's discretion (privacy-preserving)

---

## 4. Security Framework

### 4.1 Threat Model

**Adversaries Considered:**
1. **Storage Node Operators**: Assume all node operators are curious or compromised
   - **Mitigation**: End-to-end encryption renders stored data unreadable
   
2. **Relay Operators**: May attempt to infer user behavior from metadata
   - **Mitigation**: Clients use privacy relays; metadata is obfuscated
   
3. **Network Eavesdroppers**: MITM attacks on file transfer
   - **Mitigation**: TLS/DTube encryption; DHT pinning
   
4. **Malicious Clients**: Unauthorized access attempts
   - **Mitigation**: Cryptographic signatures prevent forged access tokens
   
5. **Compromised User Device**: Local key leakage
   - **Mitigation**: Hardware wallet or HSM support; session key isolation

### 4.2 Encryption Specifications

**File Encryption:**
- Algorithm: ChaCha20-Poly1305 (AEAD)
- Key Size: 256-bit
- Nonce: 96-bit (random per encryption)
- Authentication Tag: 128-bit (built into Poly1305)

**Key Derivation:**
- Algorithm: HKDF-SHA256
- Salt: User's public key (or random, stored in file metadata)
- Info String: `vault_id || file_id || purpose`
- Output: Per-file encryption keys from master vault key

**Metadata Encryption:**
- Filenames and tags: Encrypted under different key than file content
- Enables search without decrypting entire file
- Uses same ChaCha20-Poly1305 scheme

**Key Management:**
- Master Key: Derived from user's Nostr keypair via HKDF
- Vault Keys: Scoped to specific vault/collection
- File Keys: Per-file, unique for each blob
- Session Keys: Short-lived, rotated per device session

### 4.3 Authentication & Non-Repudiation

**User Authentication:**
- Nostr signature (Ed25519) proves identity
- No password required; keypair-based authentication
- Optional MFA through hardware wallet requirement

**Data Authenticity:**
- All file shards signed by uploader
- Each permission grant signed by granter
- Relay events signed by client; relay verifies before storing

**Integrity Verification:**
- HMAC-SHA256 over encrypted file content
- Hash chains for version control
- Merkle tree for shard reconstruction verification

### 4.4 Privacy Considerations

**Data at Rest:**
- No plaintext files on any storage node
- Metadata encrypted; relays see only ciphertext event contents
- No plain IP logging for file access (use Tor/VPN if concerned)

**Data in Transit:**
- TLS 1.3+ for all network transfers
- Perfect forward secrecy via ephemeral DH
- File shards transmitted over separate sessions

**Metadata Privacy:**
- Nostr events encrypted when possible
- Relay operator cannot infer file ownership from patterns
- Optional randomized file access to defeat timing analysis

**User Behavior Privacy:**
- Client-side search; relays unaware of queries
- Optional fake access events to hide true access patterns
- No analytics or telemetry in FOSS build

---

## 5. User Experience Considerations

### 5.1 Onboarding & Key Management

**First-Time User Flow:**
1. User imports or generates Nostr keypair
2. Selects trusted relay set (provided recommendations)
3. Chooses storage provider or runs local node
4. Creates initial vault
5. Completes with simple tutorial

**Key Backup & Recovery:**
- Clear guidance on backing up private key (nsec)
- QR code export option
- Hardware wallet integration option
- Recovery mechanisms explained before first use

### 5.2 Permission Sharing

**Simplified UI:**
- Share button → Enter recipient's npub → Select permission level → Auto-generates token
- Recipient sees notification and accept/decline option
- Shared files appear in recipient's "Shared with Me" section

**Advanced Options:**
- Time-bound shares with expiration
- Usage limits (e.g., download count)
- Audit trail showing who accessed when
- Revocation management with history

### 5.3 Transparency & Trust

**Clear Indicators:**
- Encryption status badges on all files
- "Not encrypted" warnings if user opts out (at own risk)
- Relay health dashboard
- Storage node status and performance metrics

**Education Components:**
- In-app explanations of encryption and decentralization
- FAQ addressing privacy questions
- Links to security audit reports
- Documentation on threat model

### 5.4 Performance & Reliability

**Fast Operations:**
- Local encryption/decryption (no server round-trips)
- Efficient shard retrieval (parallel downloads)
- Cached decryption keys (user-controlled lifetime)
- Progressive upload/download with resumability

**Reliability Features:**
- Automatic shard re-replication on node failure
- User notifications for degraded redundancy
- Background healing (re-replicate missing shards)
- Graceful handling of relay/node outages

---

## 6. Deployment & Infrastructure

### 6.1 FOSS Deployment Model

**Open Source Repository:**
- All source code under OSI-approved license (e.g., AGPL, MIT, GPL)
- Community contributions encouraged and reviewed
- Regular security audits (public reports)
- Reproducible builds for binary integrity verification

**Client Application Distribution:**
- Web app hosted on user's own server or Vercel (optional)
- Desktop client available (Electron, Tauri, or native)
- CLI tool for scripting and server deployments
- Mobile clients (React Native or native)

### 6.2 Relay Ecosystem

**User-Controlled Relays:**
- Ability to run personal relay on home server/NAS
- Configuration for storage backend (SQLite, PostgreSQL, etc.)
- Optional backup relays for redundancy
- Public relay discovery via Nostr directory (NIP-66)

**Public Relay Integration:**
- Metadata stored on existing Nostr relays (with user consent)
- Relays receive fees from users or operate as public good
- Relay operators cannot access encrypted file contents
- Users can migrate to different relays without data loss

### 6.3 Storage Node Deployment

**Self-Hosted:**
- Users can run storage node on home server
- Simple container (Docker, Podman) for deployment
- Automatic NAT traversal and P2P hole-punching
- Join existing DHT for discoverability

**Provider-Integrated:**
- Integration with IPFS, Filecoin, Arweave endpoints
- API abstraction for multiple storage backends
- Cost tracking and optimization

**Hybrid:**
- Users choose mix of free personal + paid provider storage
- Automatic load balancing across nodes
- Fallback to other nodes if primary becomes unavailable

---

## 7. Scalability & Performance

### 7.1 Scaling Dimensions

| Dimension | Approach |
|-----------|----------|
| **Concurrent Users** | Relay sharding; horizontal relay scaling |
| **File Size** | Content addressing + sharding; streaming downloads |
| **Storage Volume** | Distributed across user-operated + provider nodes |
| **Metadata Throughput** | Relay federation; caching at client layer |
| **Network Bandwidth** | CDN integration; geographic node distribution |

### 7.2 Optimization Strategies

- **Lazy Loading**: Metadata only fetched when needed
- **Compression**: Optional ZSTD compression before encryption
- **Deduplication**: Content-addressed storage prevents duplicate shards
- **Caching**: Client-side encryption key and metadata cache
- **Batch Operations**: Group multiple file operations into single relay query

---

## 8. Integration with Nostr Ecosystem

### 8.1 NIP Compliance

**Utilized NIPs:**
- **NIP-01**: Basic protocol (events, relays)
- **NIP-04/NIP-44**: Encrypted messaging (sharing permissions)
- **NIP-07**: Key sign requests (user authentication)
- **NIP-42**: Authentication (relay auth)
- **NIP-66**: Directory of relays and services

**Custom Extensions:**
- Custom event kinds for file storage metadata
- Tags for shard references and access control
- Backward-compatible with standard Nostr clients

### 8.2 Interoperability

**With Nostr Clients:**
- File storage discoverable via Nostr events
- Shared files accessible through standard Nostr clients
- DMs with access tokens work across platforms

**With External Services:**
- Export data for archival (unencrypted locally)
- Import from other decentralized storage systems
- Compatibility with IPFS/Arweave gateways

---

## 9. Security Audit & Compliance

### 9.1 Audit Requirements

**Recommended Audits:**
- Cryptographic implementation review
- Access control logic analysis
- Metadata privacy assessment
- Relay/storage integration security

**Post-Audit:**
- Public disclosure of findings and fixes
- Quarterly security updates
- Community vulnerability reporting program
- Bug bounty (if funded)

### 9.2 Compliance Considerations

**Privacy Regulations (GDPR, CCPA):**
- User data deletion: Revoke encryption key, remove from relays
- Right to portability: Export unencrypted locally
- Data minimization: No tracking; minimal metadata collection

**Licensing:**
- All dependencies FOSS-compatible
- Viral license (AGPL) if closed-source use must be prevented
- License compatibility checked in CI/CD

---

## 10. Success Metrics & KPIs

### 10.1 Technical Metrics

- **Availability**: 99.5%+ uptime for relay coordination
- **Performance**: Sub-second file encryption; <5s shard retrieval
- **Redundancy**: All shards replicated to minimum 3 nodes
- **Security**: Zero known vulnerabilities post-audit
- **Adoption**: 1000+ active users within 12 months

### 10.2 User Experience Metrics

- **Onboarding**: <5 minutes for new user setup
- **Satisfaction**: >4.0/5 user rating
- **Retention**: >60% monthly retention
- **Privacy Confidence**: >80% of users trust encryption claims

### 10.3 Ecosystem Health

- **Community**: 50+ GitHub contributors
- **Audits**: 2+ independent security audits per year
- **Documentation**: Comprehensive API and user guides
- **Interoperability**: Compatible with 3+ storage backends

---

## 11. Roadmap Phases

### Phase 1: Foundation (Months 1-3)
- Core encryption/decryption engine
- Nostr event types and relay integration
- Basic file upload/download
- Permission token mechanism

### Phase 2: Core Application (Months 4-6)
- Web and desktop clients with UI
- Share functionality and access management
- Distributed shard storage
- Relay redundancy

### Phase 3: Enhancement (Months 7-9)
- Collaborative features (comments, versions)
- Advanced search and indexing
- Mobile client
- Hardware wallet support

### Phase 4: Ecosystem (Months 10+)
- Public security audit
- Provider integrations (IPFS, Filecoin)
- Community relay network
- Advanced privacy features (oblivious transfer, ZKPs)

---

## 12. Conclusion

This decentralized storage solution leverages the Nostr protocol to create a privacy-first, user-controlled data storage system. By combining end-to-end encryption, distributed storage, capability-based access control, and FOSS principles, the system achieves a sustainable, trustless ecosystem where users maintain complete sovereignty over their data.

The architecture prioritizes security without sacrificing usability, providing clear threat model analysis, cryptographic specifications, and deployment flexibility for both individual users and organizations. Integration with the Nostr ecosystem ensures interoperability and benefits from the growing network of relays and services.

---

## Appendix: Technical Glossary

- **AEAD**: Authenticated Encryption with Associated Data
- **HKDF**: HMAC-based Key Derivation Function
- **NIP**: Nostr Improvement Proposal
- **Nostr**: Notes and Other Stuff Transmitted by Relays
- **RLS**: Row-Level Security
- **DHT**: Distributed Hash Table
- **Shard**: Fragment of encrypted file distributed across nodes
- **Relay**: Nostr server receiving and storing events
- **Vault**: Collection of user files and encrypted metadata
- **Capability Token**: Cryptographic proof of permission grant
