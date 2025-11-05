# macOS Icon Generation

Your Windows icon is ready at build/icon.ico

To create the macOS icon (icon.icns), you have a few options:

## Option 1: Online Converter (Easiest)
1. Go to https://cloudconvert.com/ico-to-icns
2. Upload build/icon.ico
3. Download and save as build/icon.icns

## Option 2: On macOS
Use the 'sips' and 'iconutil' command line tools (see ICON_SETUP_GUIDE.md)

## Option 3: Use a PNG version
If you have a PNG version of your logo:
- Save it as logo.png (1024x1024 recommended)
- Run: npx electron-icon-builder --input=./logo.png --output=./build

For now, you can build Windows installers without the macOS icon.
