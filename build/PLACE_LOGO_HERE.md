# IMPORTANT: Place Your Favicon Here First!

## Quick Setup (Recommended)

1. **Save your favicon image as `logo.png`** in this project root folder
   - The colorful gradient "S" image you showed me
   - Should be at least 512x512 pixels (1024x1024 is better)

2. **Run the icon generator:**
   ```bash
   npx electron-icon-builder --input=./logo.png --output=./build
   ```

3. **Done!** Your icons are ready. Now build:
   ```bash
   npm run electron:build:win
   ```

## What This Will Create

The command will generate:
- ✅ `build/icon.ico` - Windows icon
- ✅ `build/icon.icns` - macOS icon  
- ✅ `build/icon.png` - Linux icon

## App Name Updated

Your app is now named: **"Setique: Founder Dashboard"**

This will appear:
- In the window title bar
- In the Windows taskbar
- In the Start menu
- In the installer

## Next Steps

1. Place your favicon as `logo.png` in the root folder
2. Run the icon generator command above
3. Build your desktop app
4. Enjoy your custom-branded application!

See [ICON_SETUP_GUIDE.md](./ICON_SETUP_GUIDE.md) for detailed instructions and troubleshooting.
