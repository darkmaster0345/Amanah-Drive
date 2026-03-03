# 📁 Amanah Drive – Privacy-First Cloud Storage for the Ummah

**Amanah Drive** is an open-source, privacy-first cloud storage alternative to Google Drive, built specifically for the Ummah.  
It uses **nostr.build** for free blob storage and **client-side encryption** to keep your data completely private — even in a public gallery.

> **Tagline:** *Your Data. Your Trust. Your Amanah.*

---

## 🧠 Core Philosophy

| Principle | Meaning |
|----------|---------|
| **🔐 Privacy First** | Files encrypted on YOUR device before upload |
| **📦 Blob Storage** | Files split into chunks, stored on nostr.build |
| **🧩 Open Source** | Transparent, auditable, community-driven |
| **🛡️ Zero Trust** | Even the server cannot read your files |
| **🤲 Sadaqah Jariyah** | Built for the Ummah, free forever |

---

## 🧱 How It Works (Overview)

```
User selects file
        ↓
File encrypted with AES-256 (client-side)
        ↓
Encrypted blob uploaded to nostr.build (free, unlimited)
        ↓
Public gallery sees only unreadable binary data
        ↓
User downloads → Decrypts locally → Original file restored
```

---

## 🗂️ Project Structure

```
amanah-drive/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/                # App pages (Dashboard, Upload, etc.)
│   ├── utils/
│   │   ├── encryption.ts     # AES-256 encryption logic
│   │   ├── nostrBuild.ts     # nostr.build API integration
│   │   └── storage.ts        # Local key storage
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript types
│   └── App.tsx
├── public/
├── docs/                      # Documentation
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md (this file)
```

---

## 🔐 Encryption Flow (Detailed)

### 1. Upload Flow

```javascript
async function uploadPrivateFile(file, userId) {
  // 1. Generate unique key for this file
  const fileKey = await generateAESKey();

  // 2. Encrypt file client-side
  const encryptedBlob = await encryptAES(file, fileKey);

  // 3. Upload to nostr.build (free)
  const response = await fetch('https://nostr.build/api/upload', {
    method: 'POST',
    body: encryptedBlob,
    headers: { 'Content-Type': 'application/octet-stream' }
  });

  const { url } = await response.json();

  // 4. Save file metadata + encrypted key (user's key encrypted with their password)
  await saveFileRecord(userId, url, file.name, encryptKeyForUser(fileKey));
}
```

### 2. Download Flow

```javascript
async function downloadAndViewFile(fileRecord, userPassword) {
  // 1. Decrypt the file key using user's password
  const fileKey = decryptKeyForUser(fileRecord.encryptedKey, userPassword);

  // 2. Download encrypted blob from nostr.build
  const encryptedBlob = await fetch(fileRecord.url);

  // 3. Decrypt blob using file key
  const originalFile = await decryptAES(encryptedBlob, fileKey);

  // 4. Present to user
  return originalFile;
}
```

---

## 🆓 Storage: nostr.build Free Tier

| Feature | Limit |
|--------|-------|
| **Total storage** | Unlimited |
| **Per file size** | Up to 100MB |
| **Privacy (free tier)** | ❌ Public gallery |
| **Our solution** | ✅ Encrypt before upload |
| **Cost** | $0 forever |

> ⚠️ Even though free uploads are public, encryption makes them unreadable to anyone without the key.

---

## 🔑 Key Management Strategy

We **never** store plaintext keys.

| Key Type | Where Stored | How |
|---------|--------------|-----|
| **User Master Key** | User's device only | Never sent to server |
| **File Encryption Keys** | Database (encrypted) | Encrypted with user's master key |
| **Recovery Key** | User's backup phrase | Printed/saved during signup |

### Key Recovery Flow

```
User forgets password
        ↓
Enter backup phrase
        ↓
Derive master key
        ↓
Decrypt all file keys
        ↓
Access restored
```

---

## 🧪 Phase 1 MVP Features (Month 1–2)

- ✅ User signup/login (Nostr keys)
- ✅ Upload file (encrypted) to nostr.build
- ✅ Download + decrypt file
- ✅ List user's files
- ✅ Delete file
- ✅ Basic UI (Tailwind + shadcn/ui)

---

## 🚀 Phase 2 Features (Month 3–4)

- 🔜 Folder support
- 🔜 File sharing (encrypted links)
- 🔜 Multiple file upload
- 🔜 Progress indicators
- 🔜 Mobile responsive

---

## 🛸 Phase 3 Features (Future)

- 🔮 File version history
- 🔮 Trash/recovery
- 🔮 Search (encrypted index)
- 🔮 Desktop app (Tauri)
- 🔮 Integration with Noor Connect
- 🔮 Integration with Hidayah OS

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Encryption** | Web Crypto API / libsodium |
| **Storage** | nostr.build API |
| **State** | Zustand |
| **Routing** | React Router v6 |
| **Auth** | Nostr keys (NIP-07) |

---

## 🧪 Environment Variables

Create a `.env` file:

```env
VITE_NOSTR_BUILD_API=https://nostr.build/api
VITE_APP_NAME=Amanah Drive
VITE_DEFAULT_STORAGE_LIMIT=100000000  # 100MB per file
```

---

## 🧑‍💻 Development Setup

```bash
# 1. Clone repo
git clone https://github.com/darkmaster0345/amanah-drive.git
cd amanah-drive

# 2. Install dependencies
npm install

# 3. Run dev server
npm run dev

# 4. Build for production
npm run build
```

---

## 🧪 Testing Checklist (Before Launch)

- [ ] Upload file < 100MB → success
- [ ] Upload file > 100MB → error (with message)
- [ ] Download file → decrypts correctly
- [ ] File list shows correctly
- [ ] Delete file → removes from list
- [ ] Logout → cannot access files
- [ ] Login with different user → sees own files only
- [ ] nostr.build URL returns encrypted data, not viewable image

---

## 🕌 Why "Amanah"?

The word **Amanah** (أمانة) means *trust, honesty, responsibility*.

In Islam, we believe all data entrusted to us must be protected.  
Google, Dropbox, and others treat your data as *their* asset.  
Amanah Drive treats your data as *your* amanah.

> *"Indeed, Allah commands you to render trusts to whom they are due."*  
> — Quran 4:58

---

## 🤝 How to Contribute

We welcome all skill levels!

### Priority Needs:
- 🔧 React/TypeScript developers
- 🔐 Security/crypto reviewers
- 🎨 UI/UX designers
- 📖 Documentation writers
- 🧪 Testers

### Getting Started:
1. Fork the repo
2. Create a feature branch
3. Submit a PR
4. Join discussions in Issues

---

## 📜 License

**MIT License** — Fully open source, forever.

---

## 🙏 Dua

> *Rabbana taqabbal minna innaka antas Sameeul Aleem*  
> *"Our Lord, accept from us. Indeed, You are the All-Hearing, the All-Knowing."*

---

**Built with 🤲 by a solo developer for the Ummah.**  
[GitHub](https://github.com/darkmaster0345) · [Report Bug](../../issues) · [Request Feature](../../issues)

---

This README gives you a **complete roadmap** for when you start coding. Want me to create the actual `encryption.ts` file with real code next?
