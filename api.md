# Enhanced Vizarr API Documentation

The Enhanced Vizarr Image Visualization Tool provides a comprehensive JavaScript API for viewing multi-dimensional images and creating interactive annotations. This document describes all available APIs with examples.

## Overview

Vizarr provides two API access modes:
1. **Hypha Core Integration** - When running in an iframe with Hypha Core
2. **Direct Browser Access** - Via URL parameters and global objects

## Core Viewer API

### Image Management

#### `addImage(config: ImageLayerConfig)`

Adds an image layer to the viewer.

**Parameters:**
- `config` (ImageLayerConfig): Image configuration object

**ImageLayerConfig Interface:**
```typescript
interface ImageLayerConfig {
  source: string;           // Required: URL to zarr image source
  name?: string;           // Optional: Display name for the image
  channel_axis?: number;   // Optional: Channel axis index for multichannel images
  // Additional visualization parameters...
}
```

**Example:**
```javascript
// Add a single image
await api.addImage({
  source: "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr",
  name: "Sample Image"
});
```

#### `getVersion()`

Returns version information about the viewer.

**Returns:**
```javascript
{
  success: true,
  version: "0.3.0",
  name: "Vizarr", 
  repository: "https://github.com/hms-dbmi/vizarr"
}
```

**Example:**
```javascript
const versionInfo = await api.getVersion();
console.log(`Using ${versionInfo.name} v${versionInfo.version}`);
```

### View State Management

#### `setViewState(viewState: ViewState)`

Sets the current view state (zoom, pan, etc.).

**Parameters:**
- `viewState` (ViewState): View configuration object

**Example:**
```javascript
await api.setViewState({
  zoom: 2,
  target: [500, 500, 0],
  // Additional view parameters...
});
```

#### `getViewState()`

Gets the current view state.

**Returns:**
```javascript
{
  success: true,
  viewState: {
    zoom: 2,
    target: [500, 500, 0],
    // Additional view parameters...
  }
}
```

**Example:**
```javascript
const currentView = await api.getViewState();
console.log("Current zoom:", currentView.viewState.zoom);
```

## Annotation API

### Layer Management

#### `add_shapes(shapes: Array, options: Object)`

Creates a new annotation layer with the specified shapes.

**Parameters:**
- `shapes` (Array): Array of coordinate arrays defining shapes
- `options` (Object): Configuration options

**Options Object:**
```javascript
{
  name?: string,              // Layer name (default: "Annotation {timestamp}")
  shape_type?: string,        // "polygon", "path", "rectangle" (default: "polygon")  
  label?: string,            // Feature label
  edge_color?: string,       // Border color (default: "#ff8c00")
  face_color?: string,       // Fill color (default: "rgba(255, 140, 0, 0.3)")
  edge_width?: number,       // Border width (default: 2)
  size?: number             // Feature size (default: 1)
}
```

**Returns:** Layer API object with methods for managing the layer

**Example:**
```javascript
// Create polygon annotations
const polygonShapes = [
  [[100, 100], [200, 100], [200, 200], [100, 200], [100, 100]], // Rectangle
  [[300, 150], [400, 100], [450, 200], [350, 250], [300, 150]]  // Pentagon
];

const layer = await api.add_shapes(polygonShapes, {
  name: "Sample Polygons",
  shape_type: "polygon",
  edge_color: "#00ff00",
  face_color: "rgba(0, 255, 0, 0.3)"
});

// Create line annotations  
const lineShapes = [
  [[50, 50], [150, 50], [150, 150]],   // L-shape
  [[200, 300], [300, 250], [400, 300]] // Curved path
];

const lineLayer = await api.add_shapes(lineShapes, {
  name: "Sample Lines", 
  shape_type: "path",
  edge_color: "#0000ff"
});
```

#### `get_layers()`

Returns information about all annotation layers.

**Returns:**
```javascript
{
  success: true,
  layers: [
    {
      id: "annotation-layer-123",
      name: "Sample Polygons", 
      featureCount: 5,
      visible: true,
      selected: false
    },
    // ... more layers
  ]
}
```

**Example:**
```javascript
const layersInfo = await api.get_layers();
console.log(`Found ${layersInfo.layers.length} annotation layers`);
layersInfo.layers.forEach(layer => {
  console.log(`- ${layer.name}: ${layer.featureCount} features`);
});
```

#### `get_layer(layerId: string)`

Gets a specific layer and returns its API object.

**Parameters:**
- `layerId` (string): The layer ID to retrieve

**Returns:**
```javascript
{
  success: true,
  layer: LayerAPI,     // Layer API object with methods
  info: {              // Layer information
    id: "annotation-layer-123",
    name: "Sample Layer",
    featureCount: 3,
    visible: true,
    selected: true
  }
}
```

**Example:**
```javascript
const result = await api.get_layer("annotation-layer-123");
const layer = result.layer;

// Use the layer API
const features = await layer.get_features();
console.log(`Layer has ${features.length} features`);
```

#### `remove_layer(layerId: string)`

Removes an annotation layer.

**Parameters:**
- `layerId` (string): The layer ID to remove

**Example:**
```javascript
await api.remove_layer("annotation-layer-123");
console.log("Layer removed successfully");
```

### Layer API Methods

When you create or retrieve a layer, you get a Layer API object with these methods:

#### `get_features()`

Returns all features in the layer as GeoJSON.

**Returns:** Array of GeoJSON Feature objects

**Example:**
```javascript
const features = await layer.get_features();
features.forEach((feature, index) => {
  console.log(`Feature ${index}:`, feature.geometry.type);
});
```

#### `set_features(features: Array)`

Replaces all features in the layer.

**Parameters:**
- `features` (Array): Array of GeoJSON Feature objects

**Example:**
```javascript
const newFeatures = [
  {
    type: "Feature",
    geometry: {
      type: "Polygon", 
      coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]
    },
    properties: {
      label: "New Rectangle"
    }
  }
];

await layer.set_features(newFeatures);
```

#### `add_feature(feature: Object)`

Adds a single feature to the layer.

**Parameters:**
- `feature` (Object): GeoJSON Feature object

**Example:**
```javascript
const newFeature = {
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: [150, 150]
  },
  properties: {
    label: "Important Point"
  }
};

await layer.add_feature(newFeature);
```

#### `add_features(features: Array)`

Adds multiple features to the layer.

**Parameters:**
- `features` (Array): Array of GeoJSON Feature objects

**Example:**
```javascript
const newFeatures = [
  {
    type: "Feature", 
    geometry: { type: "Point", coordinates: [100, 200] },
    properties: { label: "Point 1" }
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [200, 200] }, 
    properties: { label: "Point 2" }
  }
];

await layer.add_features(newFeatures);
```

#### `remove_feature(featureId: string)`

Removes a feature by ID.

**Parameters:**
- `featureId` (string): The feature ID to remove

**Example:**
```javascript
await layer.remove_feature("feature-123");
```

#### `remove_features(featureIds: Array)`

Removes multiple features by ID.

**Parameters:**  
- `featureIds` (Array): Array of feature IDs to remove

**Example:**
```javascript
await layer.remove_features(["feature-123", "feature-456"]);
```

#### `clear_features()`

Removes all features from the layer.

**Example:**
```javascript
await layer.clear_features();
console.log("All features removed from layer");
```

#### `update_feature(featureId: string, newFeature: Object)`

Updates an existing feature.

**Parameters:**
- `featureId` (string): The feature ID to update
- `newFeature` (Object): New GeoJSON Feature object

**Example:**
```javascript
const updatedFeature = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [[[50, 50], [150, 50], [150, 150], [50, 150], [50, 50]]]
  },
  properties: {
    label: "Updated Rectangle",
    color: "#ff0000"
  }
};

await layer.update_feature("feature-123", updatedFeature);
```

#### `select_feature(featureId: string)`

Selects a feature for editing.

**Parameters:**
- `featureId` (string): The feature ID to select

**Example:**
```javascript
await layer.select_feature("feature-123");
console.log("Feature selected for editing");
```

#### `select_features(featureIds: Array)`

Selects multiple features for editing.

**Parameters:**
- `featureIds` (Array): Array of feature IDs to select

**Example:**
```javascript
await layer.select_features(["feature-123", "feature-456"]);
console.log("Multiple features selected");
```

#### `update_config(config: Object)`

Updates layer configuration.

**Parameters:**
- `config` (Object): Layer configuration options

**Example:**
```javascript
await layer.update_config({
  visible: true,
  opacity: 0.8,
  color: "#00ff00"
});
```

## User Interface Features

### Interactive Drawing Tools

The viewer provides interactive drawing tools accessible through the UI:

- **Polygon Tool** - Click points to draw polygons, double-click to complete
- **Rectangle Tool** - Drag to draw rectangles  
- **Point Tool** - Click to place points
- **Line Tool** - Click points to draw lines/paths

### Keyboard Shortcuts

- **Ctrl+Z / Cmd+Z** - Undo last annotation
- **Delete / Backspace** - Delete selected annotations

### Drawing Modes

- **View Mode** - Navigate and view images
- **Draw Mode** - Create new annotations
- **Select Mode** - Select and edit existing annotations

## URL Parameters

For direct browser access, you can load images via URL parameters:

```
http://localhost:3030/?source=https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr&name=Sample%20Image
```

**Parameters:**
- `source` - URL to zarr image source (required)
- `name` - Display name for the image
- `viewState` - JSON-encoded view state

## Complete Usage Examples

### Basic Image Viewing

```javascript
// Simple image loading
await api.addImage({
  source: "https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr",
  name: "Medical Scan"
});

// Set initial view
await api.setViewState({
  zoom: 1,
  target: [1000, 1000, 0]
});
```

### Creating Annotations

```javascript
// Create cell outlines
const cellShapes = [
  [[100, 100], [200, 120], [180, 200], [90, 180], [100, 100]], // Cell 1
  [[300, 150], [400, 160], [390, 250], [280, 240], [300, 150]]  // Cell 2
];

const cellLayer = await api.add_shapes(cellShapes, {
  name: "Cell Boundaries",
  shape_type: "polygon", 
  edge_color: "#ff0000",
  face_color: "rgba(255, 0, 0, 0.2)",
  label: "cell"
});

// Add measurement points
const measurementPoints = [
  [150, 150], // Center of cell 1
  [350, 200]  // Center of cell 2  
];

const pointLayer = await api.add_shapes(measurementPoints.map(p => [p]), {
  name: "Measurement Points",
  shape_type: "polygon", // Points are single-coordinate polygons
  edge_color: "#0000ff",
  size: 5,
  label: "measurement"
});

// Add connecting line
const connectionLine = [
  [150, 150], // From cell 1 center
  [350, 200]  // To cell 2 center
];

const lineLayer = await api.add_shapes([connectionLine], {
  name: "Cell Connection",
  shape_type: "path",
  edge_color: "#00ff00",
  edge_width: 3,
  label: "connection"
});
```

### Managing Annotation Data

```javascript
// Get all layers
const layersInfo = await api.get_layers();

// Process each layer
for (const layerInfo of layersInfo.layers) {
  const result = await api.get_layer(layerInfo.id);
  const layer = result.layer;
  
  // Get features
  const features = await layer.get_features();
  
  // Add metadata to features
  const updatedFeatures = features.map(feature => ({
    ...feature,
    properties: {
      ...feature.properties,
      timestamp: new Date().toISOString(),
      annotator: "researcher1"
    }
  }));
  
  // Update layer with metadata
  await layer.set_features(updatedFeatures);
}
```

### Advanced Layer Operations

```javascript
// Create a layer for different cell types
const tumorCells = [
  [[400, 300], [500, 310], [490, 400], [380, 390], [400, 300]]
];

const tumorLayer = await api.add_shapes(tumorCells, {
  name: "Tumor Cells",
  edge_color: "#ff4444",
  face_color: "rgba(255, 68, 68, 0.3)"
});

// Add individual features with specific properties
await tumorLayer.add_feature({
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [[[600, 350], [700, 360], [690, 450], [580, 440], [600, 350]]]
  },
  properties: {
    label: "malignant_cell",
    confidence: 0.95,
    size: "large",
    notes: "Irregular shape, high mitotic activity"
  }
});

// Select features for batch operations
const features = await tumorLayer.get_features();
const largeFeatureIds = features
  .filter(f => f.properties.size === "large")
  .map(f => f.id);

await tumorLayer.select_features(largeFeatureIds);

// Update configuration for selected features
await tumorLayer.update_config({
  edge_color: "#cc0000",
  edge_width: 4
});
```

## Error Handling

All API methods return promises and may throw errors. Always use try-catch blocks:

```javascript
try {
  const layer = await api.add_shapes(shapes, options);
  console.log("Layer created successfully:", layer.id);
} catch (error) {
  console.error("Failed to create layer:", error.message);
}
```

## Integration with External Systems

### Hypha Core Integration

When running in an iframe with Hypha Core, all these APIs are automatically exported and available:

```javascript
// In Hypha Core environment
const vizarr = await api.getService("vizarr");

// Use the APIs
await vizarr.addImage({ source: "..." });
const layer = await vizarr.add_shapes([...], {...});
```

### Direct Browser Access

When running standalone, APIs are available via global objects:

```javascript
// Access annotation controller directly
const controller = window.annotationController;
if (controller) {
  const layers = await controller.getAllLayers();
  console.log("Available layers:", layers);
}
```

## Best Practices

1. **Always check for API availability** before making calls
2. **Use meaningful layer and feature names** for better organization
3. **Handle errors gracefully** with try-catch blocks
4. **Batch operations** when possible for better performance
5. **Use appropriate shape types** for your annotation needs
6. **Include metadata** in feature properties for data tracking
7. **Test with real data sources** during development

## Data Formats

### Supported Image Formats

- **OME-NGFF/Zarr** - Primary format for multidimensional images
- **Remote sources** - HTTPS URLs to zarr stores
- **Local zarr** - File-based zarr stores (when served appropriately)

### GeoJSON Feature Format

Annotations use standard GeoJSON format:

```javascript
{
  "type": "Feature",
  "id": "unique-feature-id",
  "geometry": {
    "type": "Polygon", // or "Point", "LineString"
    "coordinates": [[[x1, y1], [x2, y2], ...]]
  },
  "properties": {
    "label": "feature-label",
    "color": "#ff0000",
    // Custom properties...
  }
}
```

## Browser Compatibility

- **Modern browsers** with ES6+ support
- **WebGL** support required for image rendering  
- **iframe support** required for Hypha Core integration
- **CORS** must be configured for remote image sources 