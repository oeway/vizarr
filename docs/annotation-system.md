# Annotation System

The vizarr annotation system provides powerful polygon drawing capabilities built on top of `@deck.gl-community/editable-layers`. This system allows users to draw, edit, and manage annotations on images.

## Features

- **Pencil Button**: Toggle between drawing and viewing modes
- **Polygon Drawing**: Draw polygons by clicking points (DrawPolygonMode)
- **Visual Feedback**: Orange styling with transparency for clear visibility
- **Integration**: Seamlessly integrated with the existing vizarr viewer

## Components

### AnnotationController

The main component that provides the UI controls and manages annotation state.

```tsx
import AnnotationController from './components/AnnotationController';

// In your viewer component
<AnnotationController 
  onFeaturesChange={(features) => console.log('Features updated:', features)}
  onLayerChange={setAnnotationLayer}
/>
```

### createAnnotationLayer

A factory function that creates annotation layers with customizable options.

```tsx
import { createAnnotationLayer } from './components/layers/AnnotationLayer';
import { DrawPolygonMode, ViewMode } from '@deck.gl-community/editable-layers';

const layer = createAnnotationLayer({
  initialFeatures: {
    type: 'FeatureCollection',
    features: []
  },
  onEdit: (updatedData) => {
    console.log('Annotation edited:', updatedData);
  },
  mode: DrawPolygonMode,
  visible: true,
  pickable: true,
  selectedFeatureIndexes: []
});
```

## Usage

1. **Enable Drawing Mode**: Click the pencil button to enter drawing mode
2. **Draw Polygons**: Click points to create polygon shapes, double-click to complete
3. **Stop Drawing**: Click the stop button to exit drawing mode (or polygon auto-completes)
4. **View Mode**: In view mode, you can interact with existing annotations

## Styling

The annotation system uses the following default styling:

- **Fill Color**: Orange with 60% transparency `[255, 140, 0, 60]`
- **Line Color**: Solid orange `[255, 140, 0, 255]`
- **Line Width**: 2 pixels
- **Highlight Color**: Yellow with transparency for hover effects

## Integration with Vizarr

The annotation system is automatically integrated into the main Viewer component:

```tsx
// In Viewer.tsx
const allLayers = annotationLayer ? [...layers, annotationLayer] : layers;

return (
  <>
    <DeckGL
      layers={allLayers}
      // ... other props
    />
    <AnnotationController 
      onFeaturesChange={handleAnnotationFeaturesChange}
      onLayerChange={setAnnotationLayer}
    />
  </>
);
```

## Available Modes

The system supports various drawing modes from `@deck.gl-community/editable-layers`:

- `DrawPolygonMode`: Draw polygons by clicking points, double-click to complete
- `ViewMode`: View and interact with existing annotations
- `ModifyMode`: Edit existing annotations
- And many more...

## Event Handling

The annotation system provides callbacks for various events:

```tsx
const handleFeaturesChange = (features: GeoJSON.FeatureCollection) => {
  // Handle annotation changes
  console.log('Updated features:', features);
  
  // Save to backend, update state, etc.
};
```

## Future Enhancements

- Support for different annotation types (points, lines, rectangles)
- Annotation labels and metadata
- Export/import functionality
- Collaboration features
- Undo/redo functionality 