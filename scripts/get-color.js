const sharp = require('sharp');
const path = require('path');

async function getDominantColor() {
  try {
    const imgPath = path.join(__dirname, '../public/logo.png');
    const { dominant } = await sharp(imgPath).stats();
    console.log(`Dominant color: rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`);
    
    const hex = '#' + [dominant.r, dominant.g, dominant.b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    console.log(`Hex: ${hex}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getDominantColor();
