# Desktop Application - Packaging & Installation Guide

This guide explains how to package the Setique Founder Dashboard as a standalone desktop application using Electron.

## 🎯 Overview

The application has been configured to run as a native desktop application on:
- **Windows** (Windows 10/11)
- **macOS** (macOS 10.13+)
- **Linux** (Ubuntu, Debian, Fedora, etc.)

## 📋 Prerequisites

Before building the desktop application, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** (comes with Node.js)
3. All dependencies installed: `npm install`

## 🚀 Running in Development Mode

To run the application in Electron during development:

```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server
2. Wait for the server to be ready
3. Launch the Electron window with hot-reload enabled
4. Open DevTools automatically for debugging

## 📦 Building for Production

### Build for All Platforms

```bash
npm run electron:build
```

### Build for Specific Platforms

#### Windows
```bash
npm run electron:build:win
```

Generates:
- `release/Setique Dashboard Setup X.X.X.exe` - NSIS installer
- `release/Setique Dashboard X.X.X.exe` - Portable executable

#### macOS
```bash
npm run electron:build:mac
```

Generates:
- `release/Setique Dashboard-X.X.X.dmg` - Disk image installer
- `release/Setique Dashboard-X.X.X-mac.zip` - ZIP archive

#### Linux
```bash
npm run electron:build:linux
```

Generates:
- `release/Setique Dashboard-X.X.X.AppImage` - Universal Linux app
- `release/setique-dashboard_X.X.X_amd64.deb` - Debian/Ubuntu package

## 🎨 Application Icons

Place your application icons in the `build/` directory:

- **Windows**: `build/icon.ico` (256x256 recommended)
- **macOS**: `build/icon.icns`
- **Linux**: `build/icon.png` (512x512 or 1024x1024)

### Quick Icon Generation

If you have a 1024x1024 PNG logo:

```bash
npx electron-icon-builder --input=./your-logo.png --output=./build
```

## 📁 Build Output

All built installers and executables are placed in the `release/` directory:

```
release/
├── Setique Dashboard Setup 1.0.0.exe       # Windows installer
├── Setique Dashboard 1.0.0.exe             # Windows portable
├── Setique Dashboard-1.0.0.dmg             # macOS installer
├── Setique Dashboard-1.0.0-mac.zip         # macOS archive
├── Setique Dashboard-1.0.0.AppImage        # Linux AppImage
└── setique-dashboard_1.0.0_amd64.deb      # Debian package
```

## 🔧 Configuration

### Electron Builder Configuration

The build configuration is in `package.json` under the `"build"` key:

```json
{
  "build": {
    "appId": "com.setique.founderdashboard",
    "productName": "Setique Dashboard",
    "directories": {
      "buildResources": "build",
      "output": "release"
    }
  }
}
```

### Customization Options

#### Change App Name
Edit `productName` in `package.json`:
```json
"productName": "Your App Name"
```

#### Change App ID
Edit `appId` in `package.json`:
```json
"appId": "com.yourcompany.yourapp"
```

#### Change Version
Edit `version` in `package.json`:
```json
"version": "1.0.0"
```

## 🖥️ Application Features

### Window Configuration
- **Default Size**: 1400x900
- **Minimum Size**: 1024x768
- **Auto-hide Menu Bar**: Yes (press Alt to show)
- **Single Instance**: Yes (prevents multiple instances)

### Menu Bar
- File: Quit
- Edit: Undo, Redo, Cut, Copy, Paste, Select All
- View: Reload, Force Reload, Zoom controls, Full Screen
- Window: Minimize, Zoom, Close

### Development Tools
In development mode, you get an additional Developer menu with:
- Toggle DevTools
- Reload (Ctrl+R / Cmd+R)

## 🔒 Security Features

The application uses Electron's security best practices:

- ✅ **Context Isolation**: Enabled
- ✅ **Node Integration**: Disabled
- ✅ **Preload Script**: Secure API bridge
- ✅ **Remote Module**: Disabled

## 📱 Installation & Distribution

### Windows Installation

1. **NSIS Installer** (`Setup.exe`):
   - Double-click the installer
   - Choose installation directory
   - Creates desktop and start menu shortcuts
   - Can be uninstalled via Control Panel

2. **Portable Version** (`.exe`):
   - No installation required
   - Run directly from any location
   - All data stored in app directory

### macOS Installation

1. **DMG Installer**:
   - Double-click the `.dmg` file
   - Drag "Setique Dashboard" to Applications folder
   - Launch from Applications or Launchpad

2. **ZIP Archive**:
   - Extract the `.zip` file
   - Move to Applications folder
   - Right-click and select "Open" on first launch

### Linux Installation

1. **AppImage**:
   ```bash
   chmod +x Setique-Dashboard-*.AppImage
   ./Setique-Dashboard-*.AppImage
   ```

2. **DEB Package** (Ubuntu/Debian):
   ```bash
   sudo dpkg -i setique-dashboard_*.deb
   sudo apt-get install -f  # Install dependencies if needed
   ```

## 🐛 Troubleshooting

### Build Fails on Windows
- Ensure Windows SDK is installed
- Run PowerShell as Administrator
- Check antivirus isn't blocking electron-builder

### Build Fails on macOS
- Install Xcode Command Line Tools: `xcode-select --install`
- Accept Xcode license: `sudo xcodebuild -license accept`

### Build Fails on Linux
- Install required packages:
  ```bash
  sudo apt-get install -y build-essential libssl-dev rpm
  ```

### App Won't Start
- Check console logs in DevTools (Development mode)
- Verify all environment variables are set correctly
- Ensure Supabase configuration is correct

### Large Build Size
The application size is optimized but includes:
- Chromium runtime (~100-150 MB)
- Node.js runtime
- Your application code and assets

To reduce size:
- Remove unused dependencies
- Optimize images and assets
- Use electron-builder compression options

## 🔄 Updates & Auto-Update

To implement auto-updates:

1. Install `electron-updater`:
   ```bash
   npm install electron-updater
   ```

2. Add update configuration to `package.json`:
   ```json
   "build": {
     "publish": {
       "provider": "github",
       "owner": "your-username",
       "repo": "your-repo"
     }
   }
   ```

3. Update `electron/main.js` to include auto-update logic

## 📊 Build Performance

Typical build times:
- **Windows**: 2-5 minutes
- **macOS**: 3-7 minutes
- **Linux**: 2-4 minutes

Build size:
- **Windows**: ~150-200 MB
- **macOS**: ~180-250 MB
- **Linux**: ~150-200 MB

## 🎓 Development Tips

### Testing Builds Locally

Before distributing, test the built application:

```bash
# Build for your platform
npm run electron:build:win  # or :mac or :linux

# Navigate to release folder
cd release

# Run the installer/app to test
```

### Environment Variables

The app respects `.env` files. Create `.env.local` with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
# Note: Groq API key is server-side only (Supabase secrets)
```

### Debugging Production Builds

To enable DevTools in production, modify `electron/main.js`:

```javascript
if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
  mainWindow.webContents.openDevTools();
}
```

Then run with:
```bash
DEBUG=true npm run electron:build
```

## 📚 Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [Vite Electron Guide](https://vitejs.dev/guide/backend-integration.html)

## 🆘 Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Check GitHub issues
4. Contact support team

---

**Ready to build?** Run `npm run electron:build` and find your installer in the `release/` folder! 🚀
