# Quick Start - Desktop Application

## ⚡ TL;DR

```bash
# Run in development
npm run electron:dev

# Build for Windows
npm run electron:build:win

# Your installer will be in: release/Setique Dashboard Setup 1.0.0.exe
```

## 🎯 What You Get

- **Native desktop app** for Windows, macOS, and Linux
- **Auto-updates** (when configured)
- **Offline support** with local data persistence
- **System tray integration** (optional)
- **Native notifications** (optional)

## 📦 Build Commands

| Command | Description | Output |
|---------|-------------|--------|
| `npm run electron:dev` | Development mode with hot-reload | - |
| `npm run electron:build` | Build for current platform | Installers in `release/` |
| `npm run electron:build:win` | Windows installer | `.exe` files |
| `npm run electron:build:mac` | macOS installer | `.dmg` and `.zip` |
| `npm run electron:build:linux` | Linux packages | `.AppImage` and `.deb` |

## 🔥 First Time Setup

1. **Add your app icon** (optional but recommended):
   - Create a 1024x1024 PNG icon
   - Run: `npx electron-icon-builder --input=./logo.png --output=./build`

2. **Test in development**:
   ```bash
   npm run electron:dev
   ```

3. **Build your installer**:
   ```bash
   npm run electron:build:win  # or :mac or :linux
   ```

4. **Find your installer**:
   - Look in the `release/` folder
   - Double-click to install

## 🎨 Customization

Edit `package.json` to change:

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "description": "Your app description",
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "Your App Name"
  }
}
```

## 📖 Full Documentation

See [DESKTOP_APP.md](./DESKTOP_APP.md) for complete documentation.

---

**Need help?** Check the troubleshooting section in DESKTOP_APP.md
