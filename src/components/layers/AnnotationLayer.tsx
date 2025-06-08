import { EditableGeoJsonLayer, DrawPolygonMode } from '@deck.gl-community/editable-layers';

interface AnnotationLayerProps {
  initialFeatures?: any;
  onEdit?: (data: any) => void;
  mode?: any;
  visible?: boolean;
  pickable?: boolean;
  selectedFeatureIndexes?: number[];
}

export function createAnnotationLayer({
  initialFeatures = {
    type: 'FeatureCollection',
    features: []
  },
  onEdit,
  mode = DrawPolygonMode,
  visible = true,
  pickable = true,
  selectedFeatureIndexes = []
}: AnnotationLayerProps) {

  return new EditableGeoJsonLayer({
    id: 'annotation-layer',
    data: initialFeatures,
    mode,
    selectedFeatureIndexes,
    onEdit,
    visible,
    pickable,
    
    // Styling for polygons
    getFillColor: [255, 140, 0, 60], // Orange with transparency
    getLineColor: [255, 140, 0, 255], // Solid orange border
    getLineWidth: 2,
    
    // Tentative feature styling (while drawing)
    getTentativeFillColor: [255, 140, 0, 40],
    getTentativeLineColor: [255, 140, 0, 255],
    getTentativeLineWidth: 2,
    
    // Interactive properties
    autoHighlight: true,
    highlightColor: [255, 255, 0, 100]
  });
} 