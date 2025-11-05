# Icon Placeholder

Place your application icons here:

- **icon.png** - 512x512 or 1024x1024 PNG for Linux
- **icon.ico** - Windows icon file (256x256 recommended, multi-resolution ICO)
- **icon.icns** - macOS icon file

## Creating Icons

You can use tools like:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- Online converters like [iConvert Icons](https://iconverticons.com/)
- Design tools like Figma, Sketch, or Adobe Illustrator

## Quick Icon Generation

If you have a 1024x1024 PNG logo, you can use this npm script:

```bash
npx electron-icon-builder --input=./your-logo.png --output=./build
```

This will generate all required icon formats automatically.
