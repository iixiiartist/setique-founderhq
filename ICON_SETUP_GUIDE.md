# Icon Setup Guide - Setique Favicon

## 📋 Quick Setup Instructions

### Step 1: Save Your Favicon Image

1. Save your favicon image (the colorful gradient "S" logo) as `logo.png` in the project root folder
2. The image should be at least 512x512 pixels (1024x1024 is recommended)

### Step 2: Generate All Icon Formats

Run this command from the project root:

```bash
npx electron-icon-builder --input=./logo.png --output=./build
```

This will automatically generate:
- `build/icon.ico` - Windows icon (256x256 multi-resolution)
- `build/icon.icns` - macOS icon (512x512)
- `build/icon.png` - Linux icon (1024x1024)

### Step 3: Build Your Desktop App

```bash
npm run electron:build:win
```

Your installer will now have your custom Setique logo!

---

## 🎨 Manual Icon Creation (Alternative)

If you prefer to create icons manually or need more control:

### For Windows (.ico)

**Option 1: Online Converter**
1. Go to https://icoconvert.com/ or https://convertio.co/png-ico/
2. Upload your `logo.png`
3. Select 256x256 size
4. Download and save as `build/icon.ico`

**Option 2: Using ImageMagick**
```bash
magick convert logo.png -define icon:auto-resize=256,128,96,64,48,32,16 build/icon.ico
```

### For macOS (.icns)

**Option 1: Online Converter**
1. Go to https://cloudconvert.com/png-to-icns
2. Upload your `logo.png`
3. Download and save as `build/icon.icns`

**Option 2: Using iconutil (macOS only)**
```bash
mkdir MyIcon.iconset
sips -z 16 16     logo.png --out MyIcon.iconset/icon_16x16.png
sips -z 32 32     logo.png --out MyIcon.iconset/icon_16x16@2x.png
sips -z 32 32     logo.png --out MyIcon.iconset/icon_32x32.png
sips -z 64 64     logo.png --out MyIcon.iconset/icon_32x32@2x.png
sips -z 128 128   logo.png --out MyIcon.iconset/icon_128x128.png
sips -z 256 256   logo.png --out MyIcon.iconset/icon_128x128@2x.png
sips -z 256 256   logo.png --out MyIcon.iconset/icon_256x256.png
sips -z 512 512   logo.png --out MyIcon.iconset/icon_256x256@2x.png
sips -z 512 512   logo.png --out MyIcon.iconset/icon_512x512.png
sips -z 1024 1024 logo.png --out MyIcon.iconset/icon_512x512@2x.png
iconutil -c icns MyIcon.iconset
mv MyIcon.icns build/icon.icns
```

### For Linux (.png)

Simply copy your high-resolution PNG:
```bash
cp logo.png build/icon.png
```

Make sure it's at least 512x512 pixels (1024x1024 recommended).

---

## ✅ Verify Icons Are Set

After generating the icons, verify they exist:

```bash
# Windows (PowerShell)
ls build/icon.*

# Expected output:
# icon.ico
# icon.icns
# icon.png
```

---

## 🚀 Build With Your New Icons

Once the icons are in place, build your desktop app:

### Windows
```bash
npm run electron:build:win
```

### macOS
```bash
npm run electron:build:mac
```

### Linux
```bash
npm run electron:build:linux
```

Your installers will now feature the beautiful Setique gradient logo!

---

## 🎯 Current Status

✅ App name updated to: **"Setique: Founder Dashboard"**
✅ Window title updated
✅ Icon paths configured in `package.json`
⏳ Waiting for icon files to be placed in `build/` folder

---

## 📁 Required File Structure

```
setique-founder-dashboard/
├── logo.png                 # Your source favicon (place here)
└── build/
    ├── icon.ico            # Generated Windows icon
    ├── icon.icns           # Generated macOS icon
    └── icon.png            # Generated Linux icon
```

---

## 🔧 Troubleshooting

### Icon doesn't appear in built app
- Make sure icon files are in the `build/` folder before building
- Verify file names are exactly: `icon.ico`, `icon.icns`, `icon.png`
- Try cleaning the build: `rm -rf release/` and rebuild

### electron-icon-builder fails
- Ensure your logo.png is at least 512x512 pixels
- Try the online converters as an alternative
- Check that you have write permissions in the build folder

### Different icon on taskbar vs window
- This is normal during development
- The correct icon will appear in the built/installed version

---

## 💡 Pro Tips

1. **Use high-resolution source**: Start with at least 1024x1024 PNG for best quality
2. **Square format**: Make sure your logo is square (1:1 aspect ratio)
3. **Simple design**: Icons look best when simple and recognizable at small sizes
4. **Test on all platforms**: Icons may look different on Windows vs macOS vs Linux
5. **Transparent background**: Use PNG with transparency for best results

---

## 📞 Need Help?

If you encounter issues:
1. Verify your source image is high quality and square
2. Try the automated `electron-icon-builder` method first
3. Fall back to online converters if needed
4. Check that files are in the correct `build/` folder

Your Setique gradient "S" logo will look great as a desktop app icon! 🎨
