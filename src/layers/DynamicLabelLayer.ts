import { type BitmapLayer, CompositeLayer, type Layer } from "deck.gl";
import type { CompositeLayerProps, UpdateParameters } from "deck.gl";
import { type Matrix4, clamp } from "math.gl";
import type { OmeColor } from "./label-layer";
import { GrayscaleBitmapLayer, createColorTexture } from "./label-layer";

type Texture = ReturnType<BitmapLayer["context"]["device"]["createTexture"]>;

export interface DynamicLabelLayerProps extends CompositeLayerProps {
  opacity: number;
  modelMatrix: Matrix4;
  colors?: ReadonlyArray<OmeColor>;
  pixelData: Uint8Array;
  width: number;
  height: number;
  bounds?: [number, number, number, number];
  dataVersion?: number; // For forcing updates when pixel data changes
}

/**
 * A dynamic label layer that can be updated in real-time with new pixel data
 * Used for brush annotation tools where the label data changes frequently
 */
export class DynamicLabelLayer extends CompositeLayer<DynamicLabelLayerProps> {
  static layerName = "VizarrDynamicLabelLayer";
  // @ts-expect-error - only way to extend the base state type
  state!: { colorTexture: Texture } & CompositeLayer["state"];

  updateState({ props, oldProps, changeFlags, ...rest }: UpdateParameters<this>): void {
    super.updateState({ props, oldProps, changeFlags, ...rest });

    // Create or update color texture
    if (props.colors !== oldProps.colors || !this.state.colorTexture) {
      this.state.colorTexture?.destroy();
      const colorTexture = createColorTexture({
        source: props.colors,
        maxTextureDimension2D: this.context.device.limits.maxTextureDimension2D,
      });
      this.setState({
        colorTexture: this.context.device.createTexture({
          width: colorTexture.width,
          height: colorTexture.height,
          data: colorTexture.data,
          dimension: "2d",
          mipmaps: false,
          sampler: {
            minFilter: "nearest",
            magFilter: "nearest",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge",
          },
          format: "rgba8unorm",
        }),
      });
    }
  }

  renderLayers(): Layer {
    const { id, pixelData, width, height, opacity, modelMatrix, bounds, dataVersion } = this.props;

    // Use provided bounds or default to full image
    const layerBounds = bounds || [0, 0, width, height];

    const pixelDataForLayer = {
      data: pixelData,
      width,
      height,
    };

    return new GrayscaleBitmapLayer({
      id: `${id}-bitmap`,
      pixelData: pixelDataForLayer,
      opacity,
      modelMatrix,
      colorTexture: this.state.colorTexture,
      bounds: layerBounds,
      // For underlying BitmapLayer
      image: new ImageData(width, height),
      pickable: false,
      // Force layer update when pixel data changes
      updateTriggers: {
        pixelData: [dataVersion, pixelData.length],
      },
    });
  }

  /**
   * Update the pixel data and trigger re-render
   * Note: Since this is a composite layer, we'll need external prop updates
   * to trigger re-renders. This method is for reference but won't work directly.
   */
  updatePixelData(newPixelData: Uint8Array): void {
    if (newPixelData.length !== this.props.pixelData.length) {
      console.warn("Pixel data size mismatch in DynamicLabelLayer");
      return;
    }

    // For CompositeLayer, the parent component needs to update props
    // This method serves as documentation for the expected interface
    console.warn("updatePixelData called on DynamicLabelLayer - parent component should update props instead");
  }

  /**
   * Update only a specific region of the pixel data (for performance)
   */
  updatePixelRegion(newPixelData: Uint8Array, region: [x: number, y: number, width: number, height: number]): void {
    const [x, y, regionWidth, regionHeight] = region;
    const { width: layerWidth, pixelData } = this.props;

    // Copy region data
    for (let row = 0; row < regionHeight; row++) {
      for (let col = 0; col < regionWidth; col++) {
        const sourceIndex = row * regionWidth + col;
        const targetIndex = (y + row) * layerWidth + (x + col);

        if (targetIndex < pixelData.length && sourceIndex < newPixelData.length) {
          pixelData[targetIndex] = newPixelData[sourceIndex];
        }
      }
    }

    // Trigger update
    this.updatePixelData(pixelData);
  }
}
