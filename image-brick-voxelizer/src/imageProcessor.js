/**
 * Image processor module for handling image uploads and pixel sampling.
 */

// LEGO-inspired color palette for optional color quantization
const LEGO_PALETTE = [
  [255, 255, 255], // White
  [0, 0, 0],       // Black
  [196, 40, 27],   // Bright Red
  [13, 105, 171],  // Bright Blue
  [245, 205, 47],  // Bright Yellow
  [40, 127, 70],   // Dark Green
  [242, 112, 94],  // Sand Red
  [254, 186, 189], // Light Pink
  [75, 151, 74],   // Bright Green
  [205, 98, 152],  // Bright Purple
  [253, 195, 131], // Light Orange
  [156, 146, 145], // Medium Stone Grey
  [99, 95, 97],    // Dark Stone Grey
  [106, 57, 9],    // Reddish Brown
  [244, 129, 71],  // Bright Orange
  [52, 43, 117],   // Earth Blue
  [53, 33, 0],     // Dark Brown
  [105, 64, 39],   // Brown
  [180, 210, 227], // Light Royal Blue
  [229, 228, 222], // Cool Silver
  [147, 135, 103], // Sand Yellow
  [170, 125, 85],  // Warm Tan
];

/**
 * Processes an uploaded image file and returns pixel data.
 */
class ImageProcessor {
  /**
   * Creates a new ImageProcessor instance.
   * @param {Object} options - Configuration options.
   * @param {number} options.maxBricks - Maximum number of bricks in the widest dimension.
   * @param {boolean} options.quantizeColors - Whether to quantize colors to LEGO palette.
   */
  constructor(options = {}) {
    this.maxBricks = options.maxBricks || 60;
    this.quantizeColors = options.quantizeColors || false;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Processes an image file and returns sampled pixel data.
   * @param {File} file - The image file to process.
   * @returns {Promise<Object>} The processed image data with pixels and dimensions.
   */
  async processFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const result = this.processImage(img);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Processes an Image element and returns sampled pixel data.
   * @param {HTMLImageElement} img - The image element to process.
   * @returns {Object} The processed image data.
   */
  processImage(img) {
    // Calculate dimensions to maintain aspect ratio
    const aspectRatio = img.width / img.height;
    let gridWidth, gridHeight;
    
    if (aspectRatio >= 1) {
      gridWidth = this.maxBricks;
      gridHeight = Math.round(this.maxBricks / aspectRatio);
    } else {
      gridHeight = this.maxBricks;
      gridWidth = Math.round(this.maxBricks * aspectRatio);
    }
    
    // Ensure minimum dimensions
    gridWidth = Math.max(gridWidth, 1);
    gridHeight = Math.max(gridHeight, 1);
    
    // Set canvas size to grid dimensions for sampling
    this.canvas.width = gridWidth;
    this.canvas.height = gridHeight;
    
    // Draw image scaled to canvas
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(img, 0, 0, gridWidth, gridHeight);
    
    // Get pixel data
    const imageData = this.ctx.getImageData(0, 0, gridWidth, gridHeight);
    const pixels = [];
    
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const i = (y * gridWidth + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        
        // Skip fully transparent pixels
        if (a < 10) continue;
        
        let color = [r, g, b];
        
        // Optionally quantize to LEGO palette
        if (this.quantizeColors) {
          color = this.findClosestColor(color);
        }
        
        pixels.push({
          x,
          y,
          color,
          alpha: a / 255
        });
      }
    }
    
    return {
      pixels,
      width: gridWidth,
      height: gridHeight,
      originalWidth: img.width,
      originalHeight: img.height
    };
  }

  /**
   * Finds the closest color in the LEGO palette.
   * @param {number[]} color - RGB color array.
   * @returns {number[]} The closest LEGO color.
   */
  findClosestColor(color) {
    let minDistance = Infinity;
    let closest = color;
    
    for (const legoColor of LEGO_PALETTE) {
      const distance = this.colorDistance(color, legoColor);
      if (distance < minDistance) {
        minDistance = distance;
        closest = legoColor;
      }
    }
    
    return closest;
  }

  /**
   * Calculates the perceptual distance between two colors.
   * Uses weighted Euclidean distance in RGB space.
   * @param {number[]} c1 - First RGB color.
   * @param {number[]} c2 - Second RGB color.
   * @returns {number} The color distance.
   */
  colorDistance(c1, c2) {
    // Weighted RGB distance (human eye is more sensitive to green)
    const rMean = (c1[0] + c2[0]) / 2;
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    
    // Red-mean color difference formula
    const weightR = 2 + rMean / 256;
    const weightG = 4;
    const weightB = 2 + (255 - rMean) / 256;
    
    return Math.sqrt(weightR * dr * dr + weightG * dg * dg + weightB * db * db);
  }

  /**
   * Converts RGB array to hex color number.
   * @param {number[]} rgb - RGB color array.
   * @returns {number} Hex color number.
   */
  static rgbToHex(rgb) {
    return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
  }

  /**
   * Adjusts brightness of a color.
   * @param {number[]} rgb - RGB color array.
   * @param {number} factor - Brightness factor (1 = no change).
   * @returns {number[]} Adjusted RGB color.
   */
  static adjustBrightness(rgb, factor) {
    return [
      Math.min(255, Math.round(rgb[0] * factor)),
      Math.min(255, Math.round(rgb[1] * factor)),
      Math.min(255, Math.round(rgb[2] * factor))
    ];
  }
}

export { ImageProcessor, LEGO_PALETTE };

