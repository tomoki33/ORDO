#!/usr/bin/env node

/**
 * Ordo App Icon Generator
 * アプリアイコン生成スクリプト
 * 
 * 使用方法:
 * node scripts/generateAppIcons.js
 * 
 * 必要なパッケージ:
 * npm install --save-dev canvas
 */

const fs = require('fs');
const path = require('path');

// ブランディング設定
const BRANDING = {
  BRAND_COLORS: {
    PRIMARY: '#6366F1',
    SECONDARY: '#8B5CF6',
    ACCENT: '#10B981',
    WHITE: '#FFFFFF',
  },
  ICON_SIZES: {
    ANDROID: {
      'mipmap-mdpi': 48,
      'mipmap-hdpi': 72,
      'mipmap-xhdpi': 96,
      'mipmap-xxhdpi': 144,
      'mipmap-xxxhdpi': 192,
    },
    IOS: {
      '20x20': 20,
      '29x29': 29,
      '40x40': 40,
      '58x58': 58,
      '60x60': 60,
      '80x80': 80,
      '87x87': 87,
      '120x120': 120,
      '180x180': 180,
    },
  },
};

/**
 * 簡単なアイコンを文字ベースで作成する関数
 * Canvas使用せずにSVG → PNG変換
 */
function generateSimpleIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${BRANDING.BRAND_COLORS.PRIMARY};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${BRANDING.BRAND_COLORS.SECONDARY};stop-opacity:1" />
      </linearGradient>
    </defs>
    
    <!-- 背景円 -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="url(#gradient)" />
    
    <!-- "O"文字 -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="none" stroke="${BRANDING.BRAND_COLORS.WHITE}" stroke-width="${size/12}" />
    
    <!-- 中央ドット -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/20}" fill="${BRANDING.BRAND_COLORS.ACCENT}" />
    
    <!-- 装飾的な要素 -->
    <circle cx="${size/2 - size/6}" cy="${size/2 - size/6}" r="${size/40}" fill="${BRANDING.BRAND_COLORS.WHITE}" opacity="0.6" />
    <circle cx="${size/2 + size/6}" cy="${size/2 - size/6}" r="${size/40}" fill="${BRANDING.BRAND_COLORS.WHITE}" opacity="0.6" />
    <circle cx="${size/2 - size/6}" cy="${size/2 + size/6}" r="${size/40}" fill="${BRANDING.BRAND_COLORS.WHITE}" opacity="0.6" />
    <circle cx="${size/2 + size/6}" cy="${size/2 + size/6}" r="${size/40}" fill="${BRANDING.BRAND_COLORS.WHITE}" opacity="0.6" />
  </svg>`;
}

/**
 * ディレクトリを作成（存在しない場合）
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * SVGファイルを生成する
 */
function generateSVGIcons() {
  console.log('🎨 Generating SVG app icons...');
  
  const assetsDir = path.join(__dirname, '../assets/icons');
  ensureDirectoryExists(assetsDir);
  
  // Android用アイコン生成
  Object.entries(BRANDING.ICON_SIZES.ANDROID).forEach(([folder, size]) => {
    const androidDir = path.join(__dirname, '../android/app/src/main/res', folder);
    ensureDirectoryExists(androidDir);
    
    const svgContent = generateSimpleIcon(size);
    const svgPath = path.join(assetsDir, `ic_launcher_${size}.svg`);
    
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Generated ${folder}/ic_launcher.svg (${size}x${size})`);
  });
  
  // iOS用アイコン生成
  Object.entries(BRANDING.ICON_SIZES.IOS).forEach(([name, size]) => {
    const svgContent = generateSimpleIcon(size);
    const svgPath = path.join(assetsDir, `AppIcon_${name}.svg`);
    
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Generated iOS AppIcon ${name} (${size}x${size})`);
  });
  
  console.log('\n📁 SVG icons generated in:', assetsDir);
  console.log('📝 Manual step required: Convert SVG to PNG using online tools or design software');
  console.log('🔗 Recommended: https://svgtopng.com/ or https://cloudconvert.com/svg-to-png');
  
  return assetsDir;
}

/**
 * Android用のアイコン配置説明
 */
function generateAndroidInstructions() {
  console.log('\n📱 Android Icon Setup Instructions:');
  console.log('1. Convert the generated SVG files to PNG format');
  console.log('2. Rename and place PNG files as follows:');
  
  Object.entries(BRANDING.ICON_SIZES.ANDROID).forEach(([folder, size]) => {
    console.log(`   - android/app/src/main/res/${folder}/ic_launcher.png (${size}x${size})`);
    console.log(`   - android/app/src/main/res/${folder}/ic_launcher_round.png (${size}x${size})`);
  });
}

/**
 * iOS用のアイコン配置説明
 */
function generateIOSInstructions() {
  console.log('\n🍎 iOS Icon Setup Instructions:');
  console.log('1. Convert the generated SVG files to PNG format');
  console.log('2. Add PNG files to ios/OrdoApp/Images.xcassets/AppIcon.appiconset/');
  console.log('3. Update Contents.json with proper references');
  
  Object.entries(BRANDING.ICON_SIZES.IOS).forEach(([name, size]) => {
    console.log(`   - AppIcon_${name}.png (${size}x${size})`);
  });
}

/**
 * アプリ名の設定
 */
function updateAppNames() {
  console.log('\n📝 Updating app display names...');
  
  // Android strings.xml更新
  const stringsPath = path.join(__dirname, '../android/app/src/main/res/values/strings.xml');
  if (fs.existsSync(stringsPath)) {
    let stringsContent = fs.readFileSync(stringsPath, 'utf8');
    stringsContent = stringsContent.replace(
      /<string name="app_name">.*?<\/string>/,
      '<string name="app_name">Ordo</string>'
    );
    fs.writeFileSync(stringsPath, stringsContent);
    console.log('✅ Updated Android app name');
  }
  
  // iOS Info.plist更新（手動設定が必要）
  console.log('📝 iOS: Manually update CFBundleDisplayName in ios/OrdoApp/Info.plist to "Ordo"');
}

/**
 * メイン実行関数
 */
function main() {
  console.log('🚀 Ordo App Icon Generator Starting...\n');
  
  try {
    const assetsDir = generateSVGIcons();
    generateAndroidInstructions();
    generateIOSInstructions();
    updateAppNames();
    
    console.log('\n🎉 App icon generation completed!');
    console.log(`📂 Check generated files in: ${assetsDir}`);
    console.log('⚡ Next steps: Convert SVG to PNG and place in appropriate directories');
    
  } catch (error) {
    console.error('❌ Error generating app icons:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  generateSimpleIcon,
  generateSVGIcons,
  BRANDING,
};
