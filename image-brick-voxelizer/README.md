# Brick Voxelizer

Transform your images into interactive 3D brick art with stunning explosion animations—inspired by those iconic building blocks we all know and love.

![LEGO Voxelizer](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

## Features

- **Image Upload**: Drag and drop or click to upload any image (PNG, JPG, WebP)
- **3D Voxelization**: Converts images into building brick-style voxel representations
- **Interactive 3D View**: Pan, rotate, and zoom around your brick creation
- **Explosion Effect**: Press spacebar to explode bricks into individual pieces with physics-like animation
- **Reassembly**: Press spacebar again to watch pieces snap back together
- **Beautiful UI**: Dark theme with frosted glass effects and smooth animations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm run preview
```

## How to Use

1. **Upload an Image**: Drag and drop an image onto the upload zone, or click to browse
2. **Explore in 3D**: 
   - **Drag** to rotate the view
   - **Scroll** to zoom in/out
   - **Right-click drag** to pan
3. **Explode**: Press **Spacebar** to scatter all bricks with a satisfying explosion effect
4. **Reassemble**: Press **Spacebar** again to snap everything back together
5. **New Image**: Click the "New Image" button to try a different image

## Tech Stack

- **Three.js** - 3D rendering engine
- **Vite** - Fast build tool and dev server
- **Vanilla JavaScript** - No framework overhead

## Project Structure

```
├── index.html              # Main HTML file
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── public/
│   └── favicon.svg         # App favicon
└── src/
    ├── main.js             # App entry point
    ├── scene.js            # Three.js scene setup
    ├── voxelizer.js        # Image to voxel conversion
    ├── explosion.js        # Explosion animation system
    ├── imageProcessor.js   # Image upload and pixel sampling
    └── style.css           # All styling
```

## License

MIT

