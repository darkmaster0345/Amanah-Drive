# Vault Quick Start Guide

Get up and running with Vault in 5 minutes!

## 🚀 Installation

### Option 1: Deploy to Vercel (Easiest)

```bash
# One-click deployment
Click "Deploy" button on GitHub
OR

# Using Vercel CLI
npm install -g vercel
vercel
```

### Option 2: Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/vault.git
cd vault

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

### Option 3: Self-Hosted

```bash
# Build static files
npm run build

# Deploy the ./out directory to your server
# (Nginx, Apache, S3, etc.)
```

---

## 🔐 First Time Setup

### 1. Create Your Identity

```
┌─────────────────────────────────────┐
│ Vault - Decentralized Storage       │
├─────────────────────────────────────┤
│ ✓ Create New Vault                  │
│ ○ Import Existing Keypair           │
└─────────────────────────────────────┘
```

**Click "Create New Vault"**

### 2. Create Master Password

```
Master Password: ••••••••••••••••••
(minimum 12 characters, recommended 20+)
```

⚠️ **IMPORTANT**: This password:
- Derives your encryption keys
- Cannot be reset or recovered
- Is NOT stored anywhere
- **Store it in a password manager**

✅ Your new keypair will be:
- Generated locally on your device
- Never sent to any server
- Stored encrypted in browser

### 3. Create Your First Vault

After login, you'll see your dashboard with a default vault ready!

```
┌─────────────────────────────────┐
│ My Vault                        │
│ 0 files • 0 bytes               │
│ ✓ Encrypted end-to-end          │
└─────────────────────────────────┘
```

---

## 📁 Upload Your First File

### Step 1: Go to Upload Tab

```
[Files] [Upload] [Dashboard]
         ↑ Click here
```

### Step 2: Drag & Drop or Click

```
┌────────────────────────────────────┐
│                                    │
│   📄 Drag files or click           │
│      to upload                     │
│                                    │
│       [Choose File]                │
│                                    │
└────────────────────────────────────┘
```

### Step 3: Wait for Encryption

```
🔒 Encrypting and uploading...
[████████████████░░░░░░░░░░░░] 75%

Your file is being encrypted
```

### Step 4: File Stored

```
✅ File "document.pdf" encrypted and stored
   Your file is now encrypted on-device
```

**What just happened**:
1. ✓ File read from your device
2. ✓ Encrypted with AES-256-GCM
3. ✓ Stored in local database
4. ✓ Metadata saved to Nostr (optional)

**File remains encrypted until you decrypt it**

---

## 📊 View Your Files

### Files Tab

```
┌────────────────────────────────────┐
│ My Vault                           │
│ 3 files stored securely            │
├────────────────────────────────────┤
│ 📄 document.pdf                    │
│    🔒 2.5 MB • Uploaded 2 hours ago│
│    Key: a7f3c2b9...                │
│    [Download] [Delete]             │
├────────────────────────────────────┤
│ 📄 presentation.pptx               │
│    🔒 8.3 MB • Uploaded 1 day ago  │
│    Key: b4c8e1d6...                │
│    [Download] [Delete]             │
├────────────────────────────────────┤
│ 📄 spreadsheet.xlsx                │
│    🔒 1.1 MB • Uploaded 3 days ago │
│    Key: c9e2a7f4...                │
│    [Download] [Delete]             │
└────────────────────────────────────┘
```

---

## 📈 Check Your Dashboard

### Dashboard Tab

Shows real-time statistics:

**Stats Cards**:
- **Total Files**: Number of encrypted files
- **Total Size**: Combined storage used
- **Vaults**: Number of vaults
- **Encrypted**: Always 100%

**Charts**:
- Files by type (pie chart)
- Files per vault (bar chart)

**Privacy Status**:
- ✓ All data encrypted end-to-end
- ✓ Client-side decryption only
- ✓ Zero-knowledge architecture

---

## 👥 Sharing Files

### Create Shareable Link (Coming Soon)

```
Click [Share] on any file
↓
Generate Link
↓
Set expiration (24h, 7d, 30d)
↓
Copy to clipboard
↓
Send to recipient
↓
Recipient can decrypt with their keypair
```

---

## 🔑 Manage Your Identity

### View Your Public Key

```
Dashboard → Privacy Status

Nostr Public Key:
npub1abcd1234efgh5678ijkl901mnop234qrst5678uvwx9yz0abc1234defg

This is your identity across Nostr
```

### Back Up Your Keypair

**DON'T LOSE THIS!**

1. Go to Settings (gear icon)
2. Click "Backup Keypair"
3. Store in secure location:
   - Password manager (Bitwarden, 1Password)
   - Hardware wallet
   - Encrypted external drive

### Import From Another Device

1. Go to Login → Import Existing Keypair
2. Paste your public key
3. Enter your master password
4. Access your vault from any device

---

## 💾 Create Multiple Vaults

Perfect for organizing by category:

```
[+ New Vault]

My Vault (default)
Personal Files
Work Documents
Family Photos
Crypto Keys
```

### Create New Vault

```
[+ New Vault]
↓
Enter name: "Work Files"
↓
Vault created!
↓
Upload files to specific vault
```

---

## 🚨 Troubleshooting

### "Password incorrect"
```
✓ Passwords are case-sensitive
✓ Make sure Caps Lock is off
✓ Check for extra spaces
✓ Password cannot be recovered - use stored backup!
```

### "File upload failed"
```
✓ Check internet connection
✓ Try smaller file first
✓ Check browser storage quota
✓ Clear browser cache and retry
```

### "Can't access my vault from another device"
```
✓ Import your public key on new device
✓ Use same master password
✓ Make sure public key is backed up
✓ Device must have internet for sync
```

### "Storage running low"
```
✓ Check Dashboard for space usage
✓ Delete old files you don't need
✓ Consider uploading to Blossom server
✓ Move older files to external storage
```

---

## ⚙️ Settings & Preferences

### Change Theme

```
Settings → Appearance
○ Light mode
○ Dark mode
○ Auto (system)
```

### Manage Nostr Relays

```
Settings → Relays
Add relay: https://relay.example.com/
Remove relay: [X]
Publish metadata: [Toggle]
```

### Blossom Server Configuration

```
Settings → Blossom
Server URL: https://cdn.example.com/
Auth Token: [optional]
Auto-upload: [Toggle]
Backup files: [Toggle]
```

---

## 🔒 Security Best Practices

### DO ✅

- ✅ Use a strong master password (20+ chars)
- ✅ Store password in password manager
- ✅ Back up your public key
- ✅ Use HTTPS only (no HTTP)
- ✅ Keep your device OS updated
- ✅ Use a reputable relay
- ✅ Review access permissions

### DON'T ❌

- ❌ Share your master password
- ❌ Use same password as other apps
- ❌ Store password in plain text
- ❌ Give access to untrusted relays
- ❌ Upload sensitive data to public relays
- ❌ Connect to sketchy networks
- ❌ Use outdated browsers

---

## 📚 Learn More

### Documentation
- **[Full README](./README.md)** - Complete feature guide
- **[Architecture](./ARCHITECTURE.md)** - How it works under the hood
- **[API Reference](./README.md#api-reference)** - Developer docs

### External Resources
- **Nostr Protocol** - https://nostr.how/
- **Web Crypto API** - https://mdn.io/crypto
- **Blossom Protocol** - https://github.com/hzrd149/blossom

### Community
- **GitHub Issues** - Report bugs
- **GitHub Discussions** - Ask questions
- **Twitter** - Follow @vaultapp

---

## 🎯 What's Next?

### Try These Features

1. **Upload Multiple Files** - Organize into categories
2. **Create Another Vault** - Separate sensitive data
3. **Check Dashboard** - See stats and charts
4. **Share a File** - Try sending to a friend
5. **Go Offline** - Check that files load without internet

### Advanced Usage

- Self-host your own Blossom server
- Run your own Nostr relay
- Contribute to open source
- Audit the code
- Join the community

---

## ❓ FAQ

**Q: Is my data really encrypted?**  
A: Yes. All encryption happens in your browser before upload.

**Q: Can I recover a lost password?**  
A: No. Passwords cannot be reset by design.

**Q: What if Vault service shuts down?**  
A: Your data is in your browser and Blossom servers (your choice). The app is fully FOSS, so anyone can fork and run it.

**Q: How much can I store?**  
A: Browser quota typically 50MB-1GB. With Blossom, unlimited.

**Q: Can I use Vault offline?**  
A: Yes! All features work offline (except sync).

**Q: Is Vault free?**  
A: Yes. 100% free and open source forever.

---

## 🎉 You're All Set!

Congratulations! You're now using **zero-knowledge encrypted storage**.

Your data is:
- ✓ Encrypted with military-grade AES-256
- ✓ Under your complete control
- ✓ Inaccessible to anyone but you
- ✓ Protected by your secure password

**Happy encrypting! 🔐**

---

Need help? Open an issue on GitHub or check the full documentation.
