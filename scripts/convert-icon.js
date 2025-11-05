const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function convertToIco() {
  try {
    const inputPath = 'g:\\favicon_io\\android-chrome-512x512.png';
    const outputPath = path.join(__dirname, '../build/icon.ico');
    
    console.log('Converting PNG to ICO...');
    console.log('Input:', inputPath);
    console.log('Output:', outputPath);
    
    const buf = await toIco([fs.readFileSync(inputPath)], {
      resize: true,
      sizes: [16, 24, 32, 48, 64, 128, 256]
    });
    
    fs.writeFileSync(outputPath, buf);
    console.log('✅ Successfully created icon.ico with multiple sizes!');
    console.log('   Sizes: 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256');
    console.log('');
    console.log('🚀 Ready to build! Run: npm run electron:build:win');
  } catch (error) {
    console.error('❌ Error converting icon:', error.message);
    process.exit(1);
  }
}

convertToIco();
