/**
 * Brush Rasterizer for converting vector brush strokes to label pixel data
 */

export interface BrushStroke {
  coordinates: number[][];
  brushSize: number;
  labelValue: number;
  mode: 'paint' | 'erase';
}

export interface ImageExtent {
  width: number;
  height: number;
  bounds: [minX: number, minY: number, maxX: number, maxY: number];
}

export class BrushRasterizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixelData: Uint8Array;

  constructor(extent: ImageExtent) {
    // Create offscreen canvas for rasterization
    this.canvas = new OffscreenCanvas(extent.width, extent.height) as any;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Initialize with transparent background
    this.imageData = this.ctx.createImageData(extent.width, extent.height);
    this.pixelData = new Uint8Array(extent.width * extent.height);
    
    // Configure canvas for clean pixel-perfect rendering
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.lineCap = 'butt';
    this.ctx.lineJoin = 'round';
  }

  /**
   * Convert viewer/screen coordinates to image pixel coordinates
   */
  private transformCoordinates(
    viewerCoords: number[], 
    viewerBounds: [number, number, number, number],
    imageBounds: [number, number, number, number]
  ): [number, number] {
    const [vMinX, vMinY, vMaxX, vMaxY] = viewerBounds;
    const [iMinX, iMinY, iMaxX, iMaxY] = imageBounds;
    
    // Normalize to 0-1 range
    const normalizedX = (viewerCoords[0] - vMinX) / (vMaxX - vMinX);
    const normalizedY = (viewerCoords[1] - vMinY) / (vMaxY - vMinY);
    
    // Scale to image coordinates - flip Y axis for canvas coordinate system
    const imageX = iMinX + normalizedX * (iMaxX - iMinX);
    const imageY = iMaxY - normalizedY * (iMaxY - iMinY); // Flip Y axis
    
    return [Math.floor(imageX), Math.floor(imageY)];
  }

  /**
   * Rasterize a linestring stroke to pixel data
   */
  rasterizeStroke(
    stroke: BrushStroke,
    viewerBounds: [number, number, number, number],
    imageBounds: [number, number, number, number]
  ): { data: Uint8Array; changedRegion: [number, number, number, number] } {
    const { coordinates, brushSize, labelValue, mode } = stroke;
    
    if (coordinates.length < 2) {
      return { data: this.pixelData, changedRegion: [0, 0, 0, 0] };
    }

    // Check if viewer bounds and image bounds are the same (1:1 mapping)
    const [vMinX, vMinY, vMaxX, vMaxY] = viewerBounds;
    const [iMinX, iMinY, iMaxX, iMaxY] = imageBounds;
    
    const boundsAreEqual = vMinX === iMinX && vMinY === iMinY && vMaxX === iMaxX && vMaxY === iMaxY;
    
    let pixelBrushSize: number;
    
    if (boundsAreEqual) {
      // Direct 1:1 mapping - use brushSize as pixel size directly
      pixelBrushSize = brushSize;
      console.log('🎨 Direct pixel mapping (bounds equal):', { brushSize, pixelBrushSize });
    } else {
      // Calculate scaling factor from world coordinates to pixels
      const worldToPixelScaleX = (iMaxX - iMinX) / (vMaxX - vMinX);
      const worldToPixelScaleY = (iMaxY - iMinY) / (vMaxY - vMinY);
      const worldToPixelScale = Math.max(worldToPixelScaleX, worldToPixelScaleY);
      
      // Convert brush size from world coordinates to pixels
      pixelBrushSize = brushSize * worldToPixelScale;
      
      console.log('🎨 Scaled mapping:', { 
        brushSize, 
        worldToPixelScale: worldToPixelScale.toFixed(3), 
        pixelBrushSize: pixelBrushSize.toFixed(1) 
      });
    }

    // Track bounding box of changes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Convert coordinates to image space
    const imageCoords = coordinates.map(coord => {
      const [x, y] = this.transformCoordinates(coord, viewerBounds, imageBounds);
      minX = Math.min(minX, x - pixelBrushSize);
      minY = Math.min(minY, y - pixelBrushSize);
      maxX = Math.max(maxX, x + pixelBrushSize);
      maxY = Math.max(maxY, y + pixelBrushSize);
      return [x, y];
    });

    // Clamp to image bounds
    minX = Math.max(0, Math.floor(minX));
    minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(this.canvas.width, Math.ceil(maxX));
    maxY = Math.min(this.canvas.height, Math.ceil(maxY));

    if (mode === 'paint') {
      // Paint mode: render existing data + new stroke
      this.renderExistingData();
      this.drawStrokeToCanvas(imageCoords, pixelBrushSize, 'rgba(255, 255, 255, 1)');
    } else {
      // Erase mode: create stroke mask on clean canvas, then apply to existing data
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawStrokeToCanvas(imageCoords, pixelBrushSize, 'rgba(255, 255, 255, 1)');
    }

    // Extract pixel data from canvas
    const canvasImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    if (mode === 'paint') {
      // Paint mode: set pixels to labelValue where stroke was drawn
      for (let i = 0; i < this.pixelData.length; i++) {
        const rgba_index = i * 4;
        const alpha = canvasImageData.data[rgba_index + 3]; // Alpha channel
        
        // If alpha > 0, pixel was drawn - set to labelValue
        if (alpha > 0) {
          this.pixelData[i] = labelValue;
        }
      }
    } else {
      // Erase mode: only erase pixels that have existing non-zero values AND are covered by stroke
      for (let i = 0; i < this.pixelData.length; i++) {
        const rgba_index = i * 4;
        const alpha = canvasImageData.data[rgba_index + 3]; // Alpha from stroke mask
        const existingValue = this.pixelData[i]; // Current pixel value
        
        // Only erase if both conditions are true:
        // 1. Stroke covers this pixel (alpha > 0)
        // 2. Pixel has existing non-zero data (existingValue > 0)
        if (alpha > 0 && existingValue > 0) {
          this.pixelData[i] = 0; // Erase the pixel
        }
        // Otherwise, keep the existing value unchanged
      }
    }

    return {
      data: this.pixelData,
      changedRegion: [minX, minY, maxX, maxY]
    };
  }

  /**
   * Apply multiple strokes and return combined result
   */
  rasterizeMultipleStrokes(
    strokes: BrushStroke[],
    viewerBounds: [number, number, number, number],
    imageBounds: [number, number, number, number]
  ): Uint8Array {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply each stroke
    for (const stroke of strokes) {
      this.rasterizeStroke(stroke, viewerBounds, imageBounds);
    }
    
    return this.pixelData;
  }

  /**
   * Get current pixel data
   */
  getPixelData(): Uint8Array {
    return this.pixelData;
  }

  /**
   * Update pixel data from external source (e.g., existing label layer)
   */
  setPixelData(data: Uint8Array): void {
    if (data.length !== this.pixelData.length) {
      throw new Error('Pixel data size mismatch');
    }
    
    this.pixelData.set(data);
    
    // Clear canvas and redraw from pixel data
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update canvas ImageData to reflect the current pixel data
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      
      this.imageData.data[i * 4] = value;     // R
      this.imageData.data[i * 4 + 1] = value; // G  
      this.imageData.data[i * 4 + 2] = value; // B
      this.imageData.data[i * 4 + 3] = value > 0 ? 255 : 0; // A
    }
    
    // Put the updated image data onto the canvas
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Render existing pixel data to canvas
   */
  private renderExistingData(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update canvas ImageData to reflect the current pixel data
    for (let i = 0; i < this.pixelData.length; i++) {
      const value = this.pixelData[i];
      
      this.imageData.data[i * 4] = value;     // R
      this.imageData.data[i * 4 + 1] = value; // G  
      this.imageData.data[i * 4 + 2] = value; // B
      this.imageData.data[i * 4 + 3] = value > 0 ? 255 : 0; // A
    }
    
    // Put the updated image data onto the canvas
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  /**
   * Draw stroke to canvas with specified color
   */
  private drawStrokeToCanvas(imageCoords: number[][], pixelBrushSize: number, color: string): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = pixelBrushSize;
    this.ctx.lineCap = 'butt';
    this.ctx.lineJoin = 'round';

    // Draw the main stroke path
    if (imageCoords.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(imageCoords[0][0], imageCoords[0][1]);
      
      for (let i = 1; i < imageCoords.length; i++) {
        this.ctx.lineTo(imageCoords[i][0], imageCoords[i][1]);
      }
      
      this.ctx.stroke();
    }

    // Add filled circles at each point for smoother, continuous brush strokes
    const radius = pixelBrushSize / 2;
    for (const [x, y] of imageCoords) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * Clear all brush strokes
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.pixelData.fill(0);
  }
} 