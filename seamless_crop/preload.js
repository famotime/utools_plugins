// seamless_crop/preload.js
// Backend logic for file operations and clipboard management

const { clipboard, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Get image from clipboard
 * @returns {string|null} Base64 Data URL or null if no image
 */
window.getClipboardImage = () => {
  try {
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      return image.toDataURL();
    }
    return null;
  } catch (error) {
    console.error('Error reading clipboard image:', error);
    return null;
  }
};

/**
 * Copy image to clipboard
 * @param {string} dataURL - Base64 Data URL of the image
 * @returns {boolean} Success status
 */
window.copyImageToClipboard = (dataURL) => {
  try {
    console.log('Copying image to clipboard...');

    const image = nativeImage.createFromDataURL(dataURL);

    if (image.isEmpty()) {
      console.error('Created image is empty');
      utools.showNotification('复制失败：图片为空');
      return false;
    }

    clipboard.writeImage(image);

    const size = image.getSize();
    console.log('Image copied successfully, size:', size);

    // Show success notification with image dimensions
    utools.showNotification(`✅ 复制成功！\n图片已复制到剪贴板\n尺寸: ${size.width} × ${size.height}`);

    return true;
  } catch (error) {
    console.error('Error copying image to clipboard:', error);
    console.error('Error stack:', error.stack);
    utools.showNotification(`❌ 复制失败\n${error.message}`);
    return false;
  }
};

/**
 * Save image to file
 * @param {string} dataURL - Base64 Data URL of the image
 * @param {string} defaultName - Default filename
 * @returns {object} Result object with success status and path
 */
window.saveImageToFile = (dataURL, defaultName = 'seamless_crop.png') => {
  try {
    console.log('Save image function called');

    // Generate timestamp-based filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `seamless_crop_${timestamp}.png`;

    console.log('Showing save dialog with filename:', filename);

    // Show save dialog
    const savePath = utools.showSaveDialog({
      title: '保存图片',
      defaultPath: filename,
      filters: [
        { name: 'PNG 图片 (*.png)', extensions: ['png'] },
        { name: 'JPEG 图片 (*.jpg, *.jpeg)', extensions: ['jpg', 'jpeg'] },
        { name: '所有文件 (*.*)', extensions: ['*'] }
      ]
    });

    console.log('Save dialog result:', savePath);

    if (!savePath) {
      console.log('User cancelled save dialog');
      utools.showNotification('已取消保存');
      return { success: false, cancelled: true };
    }

    // Determine format based on file extension
    const ext = path.extname(savePath).toLowerCase();
    let finalDataURL = dataURL;

    // Convert to JPEG if needed
    if (ext === '.jpg' || ext === '.jpeg') {
      // Create temporary canvas to convert to JPEG
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = '#FFFFFF'; // White background for JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        finalDataURL = canvas.toDataURL('image/jpeg', 0.95);
      };
      img.src = dataURL;
    }

    // Convert base64 to buffer
    const base64Data = finalDataURL.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('Writing file to:', savePath);
    console.log('Buffer size:', buffer.length, 'bytes');

    // Write file
    fs.writeFileSync(savePath, buffer);

    const savedFileName = path.basename(savePath);
    const savedDir = path.dirname(savePath);

    console.log('File saved successfully:', savePath);

    utools.showNotification(`图片保存成功！\n${savedFileName}\n位置: ${savedDir}`);

    return {
      success: true,
      path: savePath,
      filename: savedFileName,
      directory: savedDir
    };
  } catch (error) {
    console.error('Error saving image:', error);
    console.error('Error stack:', error.stack);
    utools.showNotification('保存失败：' + error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get image info from clipboard
 * @returns {object|null} Image dimensions and format info
 */
window.getClipboardImageInfo = () => {
  try {
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const size = image.getSize();
      return {
        width: size.width,
        height: size.height,
        aspectRatio: image.getAspectRatio(),
        isEmpty: false
      };
    }
    return { isEmpty: true };
  } catch (error) {
    console.error('Error getting clipboard image info:', error);
    return { isEmpty: true };
  }
};

/**
 * Open file dialog and load image
 * @returns {string|null} Base64 Data URL or null if cancelled
 */
window.openImageFile = () => {
  try {
    console.log('Opening file dialog...');

    const filePaths = utools.showOpenDialog({
      title: '选择图片文件',
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
        { name: 'PNG 图片', extensions: ['png'] },
        { name: 'JPEG 图片', extensions: ['jpg', 'jpeg'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    console.log('File dialog result:', filePaths);

    if (!filePaths || filePaths.length === 0) {
      console.log('User cancelled file selection');
      return null;
    }

    const filePath = filePaths[0];
    console.log('Loading image from:', filePath);

    // Read file and convert to base64
    const imageBuffer = fs.readFileSync(filePath);
    const image = nativeImage.createFromBuffer(imageBuffer);

    if (image.isEmpty()) {
      console.error('Failed to load image from file');
      utools.showNotification('无法加载图片：文件格式不支持');
      return null;
    }

    const size = image.getSize();
    console.log('Image loaded successfully, size:', size);

    const dataURL = image.toDataURL();
    utools.showNotification(`图片已加载\n${path.basename(filePath)}\n尺寸: ${size.width} × ${size.height}`);

    return dataURL;
  } catch (error) {
    console.error('Error opening image file:', error);
    console.error('Error stack:', error.stack);
    utools.showNotification('打开图片失败：' + error.message);
    return null;
  }
};

// Export functions for uTools feature entry
window.exports = {
  "seamless_crop": {
    mode: "none",
    args: {
      enter: (action) => {
        // Plugin entry point - handled by index.html
        console.log('Seamless Crop plugin entered');
      }
    }
  }
};
