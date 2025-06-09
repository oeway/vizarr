import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Grid,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  Box,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import {
  Navigation as CursorIcon,
  ControlCamera as SelectIcon,
  Edit as PencilIcon,
  Brush as BrushIcon,
  Undo,
  Delete,
  Hexagon as PolygonIcon,
  Rectangle as RectangleIcon,
  Place as PointIcon,
  Timeline as LineIcon,
  TouchApp as ClickIcon,
  PanTool as DragIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Layers as LayersIcon,
  Visibility,
  VisibilityOff,
  Category as VectorIcon,
  Image as LabelIcon,
  CleaningServices as EraserIcon
} from '@mui/icons-material';
import { makeStyles } from '@mui/styles';
import { ViewMode, DrawPolygonMode, DrawRectangleMode, DrawPointMode, DrawLineStringMode, ModifyMode, EditableGeoJsonLayer } from '@deck.gl-community/editable-layers';
import { DynamicLabelLayer } from '../../layers/DynamicLabelLayer';
import { BrushRasterizer } from '../../utils/BrushRasterizer';
import { Matrix4 } from 'math.gl';
import { DrawBrushStrokeMode } from '../../modes/DrawBrushStrokeMode';

const useStyles = makeStyles({
  section: {
    marginTop: '8px',
    overflow: 'hidden', // Prevent section from overflowing
    maxWidth: '100%',
  },
  toolGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: '8px',
    maxWidth: '100%',
    overflow: 'hidden', // Prevent toolbar from overflowing
  },
  toggleButton: {
    minWidth: '32px',
    height: '32px',
    padding: '4px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    '&.Mui-selected': {
      backgroundColor: 'rgba(255, 140, 0, 0.8)',
      color: 'white',
      '&:hover': {
        backgroundColor: 'rgba(255, 140, 0, 0.9)',
      }
    },
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  },
  iconButton: {
    minWidth: '32px',
    height: '32px',
    padding: '4px',
    color: 'white',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  },
  layerList: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    padding: '4px',
    maxHeight: '200px',
    maxWidth: '100%',
    overflowY: 'auto',
    overflowX: 'hidden', // Prevent horizontal overflow
    wordWrap: 'break-word', // Break long text
  },
  layerItem: {
    borderRadius: '4px',
    marginBottom: '2px',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  },
  selectedLayerItem: {
    borderRadius: '4px',
    marginBottom: '2px',
    backgroundColor: 'rgba(255, 140, 0, 0.2)',
    border: '1px solid rgba(255, 140, 0, 0.5)',
    '&:hover': {
      backgroundColor: 'rgba(255, 140, 0, 0.3)',
    }
  },
  layerChip: {
    height: '20px',
    fontSize: '10px',
    backgroundColor: 'rgba(255, 140, 0, 0.3)',
    color: 'white',
  },
  addButton: {
    minWidth: '32px',
    height: '32px',
    backgroundColor: 'rgba(255, 140, 0, 0.8)',
    color: 'white',
    '&:hover': {
      backgroundColor: 'rgba(255, 140, 0, 0.9)',
    }
  }
});

interface AnnotationLayer {
  id: string;
  name: string;
  type: 'vector' | 'label';
  features: any[];
  visible: boolean;
  selectedFeatureIndexes: number[];
  // Label-specific properties
  labelData?: Uint8Array;
  width?: number;
  height?: number;
  bounds?: [number, number, number, number];
  dataVersion?: number; // For tracking pixel data updates
}

interface AnnotationSectionProps {
  onLayersChange: (layers: any[]) => void;
}

interface LayerHistoryState {
  layers: AnnotationLayer[];
  selectedLayerId: string | undefined;
}

const AnnotationSection: React.FC<AnnotationSectionProps> = ({ onLayersChange }) => {
  const classes = useStyles();
  const [annotationLayers, setAnnotationLayers] = useState<AnnotationLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | undefined>();
  const [currentMode, setCurrentMode] = useState<'view' | 'draw' | 'select' | 'brush' | 'eraser'>('view');
  const [currentShape, setCurrentShape] = useState<string>('polygon');
  const [currentDrawMode, setCurrentDrawMode] = useState<'click' | 'drag'>('click');
  const [brushSize, setBrushSize] = useState<number>(10);
  const [brushLabelValue, setBrushLabelValue] = useState<number>(1);
  const deckLayersRef = useRef<EditableGeoJsonLayer[]>([]);
  const brushRasterizersRef = useRef<Map<string, BrushRasterizer>>(new Map());
  
  // History state for undo/redo functionality
  const [history, setHistory] = useState<LayerHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Save current state to history
  const saveToHistory = useCallback(() => {
    const currentState: LayerHistoryState = {
      layers: annotationLayers.map(layer => ({
        ...layer,
        features: [...layer.features],
        labelData: layer.labelData ? new Uint8Array(layer.labelData) : undefined
      })),
      selectedLayerId
    };
    
    setHistory(prev => {
      // Remove any future history beyond current index
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(currentState);
      // Limit history size to prevent memory issues
      return newHistory.slice(-50); // Keep last 50 states
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, 49)); // Max index of 49
  }, [annotationLayers, selectedLayerId, historyIndex]);

  // Expose annotation controller methods to global window for API access
  React.useEffect(() => {
    const annotationController = {
      async addAnnotationLayer(layer: AnnotationLayer) {
        console.log('API: Adding annotation layer:', layer.id);
        setAnnotationLayers(prev => [...prev, layer]);
        setSelectedLayerId(layer.id);
        setCurrentMode('draw');
        return layer;
      },

      async getAllLayers() {
        console.log('API: Getting all layers, count:', annotationLayers.length);
        return annotationLayers.map(layer => ({
          id: layer.id,
          name: layer.name,
          type: layer.type,
          featureCount: layer.features.length,
          visible: layer.visible,
          selected: layer.id === selectedLayerId,
          // Label-specific info
          ...(layer.type === 'label' && {
            width: layer.width,
            height: layer.height,
            bounds: layer.bounds,
            dataVersion: layer.dataVersion
          })
        }));
      },

      async removeLayer(layerId: string) {
        console.log('API: Removing layer:', layerId);
        setAnnotationLayers(prev => prev.filter(layer => layer.id !== layerId));
        if (selectedLayerId === layerId) {
          setSelectedLayerId(undefined);
        }
      },

      async getLayerFeatures(layerId: string) {
        console.log('API: Getting features for layer:', layerId);
        const layer = annotationLayers.find(l => l.id === layerId);
        return layer ? layer.features : [];
      },

      async setLayerFeatures(layerId: string, features: any[]) {
        console.log('API: Setting features for layer:', layerId, 'count:', features.length);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { ...layer, features: [...features], selectedFeatureIndexes: [] }
            : layer
        ));
      },

      async addFeatureToLayer(layerId: string, feature: any) {
        console.log('API: Adding feature to layer:', layerId);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { ...layer, features: [...layer.features, feature] }
            : layer
        ));
      },

      async addFeaturesToLayer(layerId: string, features: any[]) {
        console.log('API: Adding features to layer:', layerId, 'count:', features.length);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { ...layer, features: [...layer.features, ...features] }
            : layer
        ));
      },

      async removeFeatureFromLayer(layerId: string, featureId: string) {
        console.log('API: Removing feature from layer:', layerId, 'feature:', featureId);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { 
                ...layer, 
                features: layer.features.filter(f => f.id !== featureId),
                selectedFeatureIndexes: []
              }
            : layer
        ));
      },

      async removeFeaturesFromLayer(layerId: string, featureIds: string[]) {
        console.log('API: Removing features from layer:', layerId, 'features:', featureIds);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { 
                ...layer, 
                features: layer.features.filter(f => !featureIds.includes(f.id)),
                selectedFeatureIndexes: []
              }
            : layer
        ));
      },

      async clearLayerFeatures(layerId: string) {
        console.log('API: Clearing features for layer:', layerId);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { ...layer, features: [], selectedFeatureIndexes: [] }
            : layer
        ));
      },

      async updateFeatureInLayer(layerId: string, featureId: string, newFeature: any) {
        console.log('API: Updating feature in layer:', layerId, 'feature:', featureId);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { 
                ...layer, 
                features: layer.features.map(f => f.id === featureId ? { ...newFeature, id: featureId } : f)
              }
            : layer
        ));
      },

      async selectFeatureInLayer(layerId: string, featureId: string) {
        console.log('API: Selecting feature in layer:', layerId, 'feature:', featureId);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { 
                ...layer, 
                selectedFeatureIndexes: [layer.features.findIndex(f => f.id === featureId)]
              }
            : layer
        ));
        setSelectedLayerId(layerId);
        setCurrentMode('select');
      },

      async selectFeaturesInLayer(layerId: string, featureIds: string[]) {
        console.log('API: Selecting features in layer:', layerId, 'features:', featureIds);
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { 
                ...layer, 
                selectedFeatureIndexes: featureIds.map(id => layer.features.findIndex(f => f.id === id)).filter(idx => idx >= 0)
              }
            : layer
        ));
        setSelectedLayerId(layerId);
        setCurrentMode('select');
      },

      async updateLayerConfig(layerId: string, config: any) {
        console.log('API: Updating layer config:', layerId, 'config:', config);
        // Update layer configuration based on config object
        setAnnotationLayers(prev => prev.map(layer =>
          layer.id === layerId
            ? { ...layer, ...config }
            : layer
        ));
      },

      // ==================== LABEL LAYER METHODS ====================

      async getLabelData(layerId: string) {
        console.log('API: Getting label data for layer:', layerId);
        const layer = annotationLayers.find(l => l.id === layerId);
        if (!layer || layer.type !== 'label') {
          throw new Error(`Label layer with ID ${layerId} not found`);
        }
        return layer.labelData || new Uint8Array(0);
      },

      async setLabelData(layerId: string, data: Uint8Array | number[]) {
        console.log('API: Setting label data for layer:', layerId, 'data length:', data.length);
        const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data);
        
        setAnnotationLayers(prev => prev.map(layer => {
          if (layer.id === layerId && layer.type === 'label') {
            return { 
              ...layer, 
              labelData: dataArray,
              dataVersion: (layer.dataVersion || 0) + 1
            };
          }
          return layer;
        }));
        
        // Save to history after setting data
        setTimeout(() => saveToHistory(), 0);
      },

      async clearLabelData(layerId: string) {
        console.log('API: Clearing label data for layer:', layerId);
        const layer = annotationLayers.find(l => l.id === layerId);
        if (!layer || layer.type !== 'label') {
          throw new Error(`Label layer with ID ${layerId} not found`);
        }
        
        const clearedData = new Uint8Array(layer.width! * layer.height!);
        setAnnotationLayers(prev => prev.map(l => {
          if (l.id === layerId) {
            return { 
              ...l, 
              labelData: clearedData,
              dataVersion: (l.dataVersion || 0) + 1
            };
          }
          return l;
        }));
        
        // Save to history after clearing
        setTimeout(() => saveToHistory(), 0);
      },

      async paintBrush(layerId: string, coordinates: number[][], brushSize: number = 10, labelValue: number = 1) {
        console.log('API: Paint brush for layer:', layerId, 'points:', coordinates.length);
        const layer = annotationLayers.find(l => l.id === layerId);
        if (!layer || layer.type !== 'label') {
          throw new Error(`Label layer with ID ${layerId} not found`);
        }

        // Create a brush stroke for rasterization
        const brushStroke = {
          coordinates: coordinates,
          brushSize: brushSize,
          labelValue: labelValue,
          mode: 'paint' as 'paint' | 'erase'
        };

        // Get or create brush rasterizer for this layer
        if (!brushRasterizersRef.current.get(layer.id) && layer.width && layer.height && layer.bounds) {
          brushRasterizersRef.current.set(layer.id, new BrushRasterizer({
            width: layer.width,
            height: layer.height,
            bounds: layer.bounds
          }));
        }

        const rasterizer = brushRasterizersRef.current.get(layer.id);
        if (rasterizer && layer.bounds) {
          // Initialize rasterizer with current label data
          rasterizer.setPixelData(layer.labelData!);
          
          // For API calls, use the image bounds as viewer bounds (1:1 mapping)
          const viewerBounds: [number, number, number, number] = layer.bounds;
          const result = rasterizer.rasterizeStroke(brushStroke, viewerBounds, layer.bounds);
          
          // Update the layer's label data
          setAnnotationLayers(prev => prev.map(l => {
            if (l.id === layer.id) {
              return { 
                ...l, 
                labelData: result.data,
                dataVersion: (l.dataVersion || 0) + 1
              };
            }
            return l;
          }));
          
          // Save to history after brush stroke
          setTimeout(() => saveToHistory(), 0);
        }
      },

      async eraseBrush(layerId: string, coordinates: number[][], brushSize: number = 10) {
        console.log('API: Erase brush for layer:', layerId, 'points:', coordinates.length);
        const layer = annotationLayers.find(l => l.id === layerId);
        if (!layer || layer.type !== 'label') {
          throw new Error(`Label layer with ID ${layerId} not found`);
        }

        // Create an erase stroke for rasterization
        const brushStroke = {
          coordinates: coordinates,
          brushSize: brushSize,
          labelValue: 0, // Eraser uses 0
          mode: 'erase' as 'paint' | 'erase'
        };

        // Get or create brush rasterizer for this layer
        if (!brushRasterizersRef.current.get(layer.id) && layer.width && layer.height && layer.bounds) {
          brushRasterizersRef.current.set(layer.id, new BrushRasterizer({
            width: layer.width,
            height: layer.height,
            bounds: layer.bounds
          }));
        }

        const rasterizer = brushRasterizersRef.current.get(layer.id);
        if (rasterizer && layer.bounds) {
          // Initialize rasterizer with current label data
          rasterizer.setPixelData(layer.labelData!);
          
          // For API calls, use the image bounds as viewer bounds (1:1 mapping)
          const viewerBounds: [number, number, number, number] = layer.bounds;
          const result = rasterizer.rasterizeStroke(brushStroke, viewerBounds, layer.bounds);
          
          // Update the layer's label data
          setAnnotationLayers(prev => prev.map(l => {
            if (l.id === layer.id) {
              return { 
                ...l, 
                labelData: result.data,
                dataVersion: (l.dataVersion || 0) + 1
              };
            }
            return l;
          }));
          
          // Save to history after erase stroke
          setTimeout(() => saveToHistory(), 0);
        }
      },

      async exportLabelImage(layerId: string, format: string = 'png') {
        console.log('API: Export label image for layer:', layerId, 'format:', format);
        const layer = annotationLayers.find(l => l.id === layerId);
        if (!layer || layer.type !== 'label') {
          throw new Error(`Label layer with ID ${layerId} not found`);
        }

        if (!layer.labelData || !layer.width || !layer.height) {
          throw new Error(`Label layer ${layerId} has no data to export`);
        }

        // Create a canvas to render the label data
        const canvas = document.createElement('canvas');
        canvas.width = layer.width;
        canvas.height = layer.height;
        const ctx = canvas.getContext('2d')!;

        // Create ImageData from label data
        const imageData = ctx.createImageData(layer.width, layer.height);
        for (let i = 0; i < layer.labelData.length; i++) {
          const value = layer.labelData[i];
          const pixelIndex = i * 4;
          
          // Convert label value to grayscale (for visualization)
          const grayValue = Math.min(255, value * 50); // Scale up for visibility
          imageData.data[pixelIndex] = grayValue;     // R
          imageData.data[pixelIndex + 1] = grayValue; // G
          imageData.data[pixelIndex + 2] = grayValue; // B
          imageData.data[pixelIndex + 3] = value > 0 ? 255 : 0; // A (transparent for zero values)
        }

        // Put the image data on canvas
        ctx.putImageData(imageData, 0, 0);

        // Export as data URL
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        return canvas.toDataURL(mimeType);
      },

      async getLabelStats(layerId: string) {
        console.log('API: Getting label stats for layer:', layerId);
        const layer = annotationLayers.find(l => l.id === layerId);
        if (!layer || layer.type !== 'label') {
          throw new Error(`Label layer with ID ${layerId} not found`);
        }

        if (!layer.labelData) {
          return {
            totalPixels: 0,
            nonZeroPixels: 0,
            uniqueLabels: [],
            labelCounts: {},
            coverage: 0
          };
        }

        const totalPixels = layer.labelData.length;
        let nonZeroPixels = 0;
        const labelCounts: Record<number, number> = {};
        
        // Count pixels and labels
        for (let i = 0; i < layer.labelData.length; i++) {
          const value = layer.labelData[i];
          if (value > 0) {
            nonZeroPixels++;
          }
          labelCounts[value] = (labelCounts[value] || 0) + 1;
        }

        const uniqueLabels = Object.keys(labelCounts).map(Number).sort((a, b) => a - b);
        const coverage = totalPixels > 0 ? nonZeroPixels / totalPixels : 0;

        return {
          totalPixels,
          nonZeroPixels,
          uniqueLabels,
          labelCounts,
          coverage
        };
      }
    };

    // Expose to global window for API access
    (window as any).annotationController = annotationController;
    console.log('🔗 Annotation controller exposed to global window');

    // Cleanup on unmount
    return () => {
      delete (window as any).annotationController;
    };
  }, [annotationLayers, selectedLayerId]);

  const selectedLayer = annotationLayers.find(layer => layer.id === selectedLayerId);
  
  // Handle undo - restore previous state
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setAnnotationLayers(previousState.layers);
      setSelectedLayerId(previousState.selectedLayerId);
      setHistoryIndex(prev => prev - 1);
      console.log('🔄 Undo applied - restored to history index:', historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Handle keyboard events for feature deletion and undo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Ctrl/Cmd+Z for undo
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }
      
      // Skip if no annotation layers exist
      if (annotationLayers.length === 0) {
        return;
      }
      
      // Handle Delete/Backspace for selected features
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedLayer) {
        // Prevent default browser behavior
        event.preventDefault();
        
        // Delete selected features
        if (selectedLayer.selectedFeatureIndexes.length > 0) {
          console.log('🗑️ Deleting selected features:', selectedLayer.selectedFeatureIndexes);
          
          const newFeatures = selectedLayer.features.filter((_, index) => 
            !selectedLayer.selectedFeatureIndexes.includes(index)
          );
          
          setAnnotationLayers(prev => prev.map(layer =>
            layer.id === selectedLayer.id
              ? { ...layer, features: newFeatures, selectedFeatureIndexes: [] }
              : layer
          ));
        }
      }
      
      // Handle Ctrl+Z / Cmd+Z for undo
      if (event.key === 'z' && (event.ctrlKey || event.metaKey) && selectedLayer) {
        // Prevent default browser behavior (like browser back)
        event.preventDefault();
        
        // Undo last feature (same logic as handleUndo)
        if (selectedLayer.features.length > 0) {
          console.log('⌨️ Undo triggered via keyboard shortcut');
          const newFeatures = selectedLayer.features.slice(0, -1);
          setAnnotationLayers(prev => prev.map(layer =>
            layer.id === selectedLayer.id
              ? { ...layer, features: newFeatures, selectedFeatureIndexes: [] }
              : layer
          ));
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedLayer, annotationLayers.length, handleUndo]);

  // Handle double-click events to stop propagation during drawing
  useEffect(() => {
    const handleDoubleClick = (event: MouseEvent) => {
      if (currentMode === 'draw') {
        console.log('🛑 Stopping double-click propagation during drawing mode');
        // Stop the event from propagating to other elements
        event.stopPropagation();
        // Prevent default browser behavior (like text selection)
        event.preventDefault();
      }
    };

    // Add event listener with capture phase to catch the event early
    document.addEventListener('dblclick', handleDoubleClick, true);
    
    // Cleanup
    return () => {
      document.removeEventListener('dblclick', handleDoubleClick, true);
    };
  }, [currentMode]);

  // Generate unique layer ID
  const generateLayerId = useCallback(() => {
    return `annotation-layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Create deck.gl layers
  useEffect(() => {
    const deckLayers: any[] = [];
    
    annotationLayers
      .filter(layer => layer.visible)
      .forEach(layer => {
        if (layer.type === 'vector') {
          // Handle vector layers with traditional drawing modes
          let mode = ViewMode;
          if (currentMode === 'draw' && layer.id === selectedLayerId) {
            switch (currentShape) {
              case 'rectangle':
                mode = DrawRectangleMode;
                break;
              case 'point':
                mode = DrawPointMode;
                break;
              case 'line':
                mode = DrawLineStringMode;
                break;
              case 'polygon':
              default:
                mode = DrawPolygonMode;
                break;
            }
          } else if (currentMode === 'select') {
            mode = ModifyMode; // ModifyMode allows both selection and editing
          }
          
          deckLayers.push(new EditableGeoJsonLayer({
            id: `editable-layer-${layer.id}`,
            data: {
              type: 'FeatureCollection',
              features: layer.features
            },
            mode,
            selectedFeatureIndexes: layer.selectedFeatureIndexes || [],
            // Configure sublayers to disable text measurements for linestrings
            _subLayerProps: {
              tooltips: {
                visible: false // Disable all tooltip text including distance measurements
              }
            },
            // Enable clicking for selection in select mode
            onClick: currentMode === 'select' ? (info, event) => {
            console.log('=== CLICK EVENT IN SELECT/EDIT MODE ===');
            console.log('🎯 Click info:', info);
            console.log('🎯 Feature index:', info.index);
            console.log('🎯 Object:', info.object);
            console.log('🎯 Event:', event);
            
            if (info.index >= 0) {
              // Feature was clicked - select it (this will show edit handles)
              console.log(`🎯 Selecting feature ${info.index} for editing in layer ${layer.id.slice(-8)}`);
              
              setAnnotationLayers(prev => prev.map(l => {
                if (l.id === layer.id) {
                  return { ...l, selectedFeatureIndexes: [info.index] };
                }
                // Clear selection in other layers
                return { ...l, selectedFeatureIndexes: [] };
              }));
            } else {
              // Clicked on empty space - clear selection (this will hide edit handles)
              console.log('🎯 Clearing selection - clicked on empty space');
              setAnnotationLayers(prev => prev.map(l => ({ ...l, selectedFeatureIndexes: [] })));
            }
            
            return true; // Indicate we handled the click
          } : undefined,
          // Configure mode behavior to handle event propagation
          modeConfig: currentMode === 'draw' ? {
            // Add any mode-specific configuration here
            // The modes should handle double-click completion internally
          } : undefined,
          onEdit: (editInfo) => {
            console.log('=== EDIT EVENT ===');
            console.log('🏷️  Edit Type:', editInfo.editType);
            console.log('🎯 Current Mode:', currentMode);
            console.log('🔍 Layer ID:', layer.id.slice(-8));
            console.log('📍 Selected Layer ID:', selectedLayerId?.slice(-8) || 'none');
            console.log('✅ Is this the selected layer?', layer.id === selectedLayerId);
            console.log('📊 Features in updatedData:', editInfo.updatedData?.features?.length || 0);
            console.log('🎲 Selected feature indexes (current layer state):', layer.selectedFeatureIndexes);
            console.log('🎯 Selected feature indexes in editInfo:', editInfo.selectedFeatureIndexes);
            console.log('🎯 Selected feature indexes in editContext:', editInfo.editContext?.selectedFeatureIndexes);
            console.log('📋 Edit context full:', editInfo.editContext);
            console.log('🔑 All edit info keys:', Object.keys(editInfo));
            console.log('📄 Full editInfo object:', editInfo);
            
            // Use the layer ID from closure to update the specific layer
            const layerId = layer.id;
            
            if (editInfo.editType === 'addFeature') {
              // Only process if this is the selected layer
              if (layer.id !== selectedLayerId) {
                console.warn('Ignoring edit on non-selected layer:', layer.id);
                return;
              }
              
              // Use updatedData instead of data - that's where the new features are
              const newData = editInfo.updatedData || editInfo.data;
              
              if (newData && newData.features) {
                console.log('✅ Adding feature to selected layer:', layer.id);
                console.log('New features count:', newData.features.length);
                
                setAnnotationLayers(prev => {
                  const updated = prev.map(l => {
                    if (l.id === layerId) {
                      console.log(`📝 Updating layer ${layerId} with ${newData.features.length} features`);
                      return { ...l, features: [...newData.features], selectedFeatureIndexes: [] };
                    }
                    return l;
                  });
                  console.log('📊 Layer state after update:', updated.map(l => ({ 
                    id: l.id.slice(-8), 
                    featureCount: l.features.length,
                    isSelected: l.id === selectedLayerId 
                  })));
                  return updated;
                });
                
                // Save to history after adding feature
                setTimeout(() => saveToHistory(), 0);

                // Keep drawing mode active for continuous drawing
                console.log('🎉 Feature added successfully - staying in draw mode');
              } else {
                console.error('❌ No valid feature data found in editInfo');
              }
            } else if (editInfo.editType === 'updateFeature' || 
                       editInfo.editType === 'finishMovePosition' ||
                       editInfo.editType === 'movePosition') {
              // Handle feature editing/moving in select mode
              const newData = editInfo.updatedData || editInfo.data;
              
              if (newData && newData.features) {
                console.log('✏️ Editing feature in select mode:', editInfo.editType, 'in layer:', layer.id.slice(-8));
                
                setAnnotationLayers(prev => prev.map(l => {
                  if (l.id === layerId) {
                    // Preserve selection during editing
                    return { 
                      ...l, 
                      features: [...newData.features],
                      // Keep the same selected indexes unless they become invalid
                      selectedFeatureIndexes: l.selectedFeatureIndexes.filter(idx => idx < newData.features.length)
                    };
                  }
                  return l;
                }));
              }
            } else if (editInfo.editType === 'selectFeatures' || editInfo.editType === 'select') {
              // Handle feature selection
              const selectedIndexes = editInfo.editContext?.selectedFeatureIndexes || 
                                     editInfo.selectedFeatureIndexes || 
                                     [];
              
              console.log('🎯 Selection event - features:', selectedIndexes, 'in layer:', layer.id.slice(-8));
              console.log('🎯 Layer is selected layer?', layer.id === selectedLayerId);
              
              setAnnotationLayers(prev => prev.map(l => {
                if (l.id === layerId) {
                  console.log(`🎯 Setting selectedFeatureIndexes for layer ${l.id.slice(-8)}:`, selectedIndexes);
                  return { ...l, selectedFeatureIndexes: [...selectedIndexes] };
                }
                // Clear selection in other layers when selecting in a different layer
                return l.id === selectedLayerId ? l : { ...l, selectedFeatureIndexes: [] };
              }));
            } else {
              // Handle unknown edit types - might contain selection info
              console.log('🔍 Unknown edit type:', editInfo.editType);
              
              // Check for any selection information in the edit context
              const possibleSelectedIndexes = editInfo.editContext?.selectedFeatureIndexes || 
                                            editInfo.selectedFeatureIndexes;
              
              // For unknown edit types, prioritize selection updates if present
              if (possibleSelectedIndexes !== undefined) {
                console.log('🎯 Found selectedFeatureIndexes in edit type:', editInfo.editType, possibleSelectedIndexes);
                console.log('🎯 Current mode during unknown edit:', currentMode);
                
                setAnnotationLayers(prev => prev.map(l => {
                  if (l.id === layerId) {
                    console.log(`🎯 Updating selection for unknown edit type in layer ${l.id.slice(-8)}:`, possibleSelectedIndexes);
                    return { ...l, selectedFeatureIndexes: [...possibleSelectedIndexes] };
                  }
                  return l.id === selectedLayerId ? l : { ...l, selectedFeatureIndexes: [] };
                }));
              } else {
                // If no selection info, check for feature updates that might preserve selection
                const newData = editInfo.updatedData || editInfo.data;
                if (newData && newData.features) {
                  console.log('✏️ Updating features for unknown edit type:', editInfo.editType);
                  
                  setAnnotationLayers(prev => prev.map(l => {
                    if (l.id === layerId) {
                      // Preserve selection if possible, but validate indexes are still valid
                      const maxIndex = newData.features.length - 1;
                      const validSelectedIndexes = l.selectedFeatureIndexes.filter(idx => idx <= maxIndex);
                      console.log(`📝 Preserving valid selection indexes for layer ${l.id.slice(-8)}:`, validSelectedIndexes);
                      return { 
                        ...l, 
                        features: [...newData.features],
                        selectedFeatureIndexes: validSelectedIndexes
                      };
                    }
                    return l;
                  }));
                }
              }
            }
          },
          getFillColor: (f: any, info: any) => {
            const isSelected = layer.selectedFeatureIndexes.includes(info?.index ?? -1);
            return isSelected ? [255, 200, 0, 150] : [255, 140, 0, 60];
          },
          getLineColor: (f: any, info: any) => {
            const isSelected = layer.selectedFeatureIndexes.includes(info?.index ?? -1);
            return isSelected ? [255, 255, 0, 255] : [255, 140, 0, 255];
          },
          getLineWidth: 2, // Use constant width for now
          // Note: getLineWidth doesn't support info parameter in deck.gl
          // We'll use different colors to show selection instead
          lineWidthMinPixels: 2,
          pointRadiusMinPixels: 4,
          editHandlePointRadiusMinPixels: 6,
          pickable: true,
          autoHighlight: currentMode === 'select',
          highlightColor: [255, 255, 255, 128],
        }));
        } else if (layer.type === 'label') {
          // Handle label layers - create both drawing vector layer and display label layer
          
          // 1. Create the actual label layer for display
          if (layer.labelData && layer.width && layer.height && layer.bounds) {
            deckLayers.push(new DynamicLabelLayer({
              id: `label-layer-${layer.id}`,
              pixelData: layer.labelData,
              width: layer.width,
              height: layer.height,
              bounds: layer.bounds,
              opacity: 1.0,
              modelMatrix: new Matrix4(),
              dataVersion: layer.dataVersion || 0,
            }));
          }
          
          // 2. Create a temporary drawing vector layer for brush strokes
          let mode = ViewMode;
          if ((currentMode === 'brush' || currentMode === 'eraser') && layer.id === selectedLayerId) {
            mode = DrawBrushStrokeMode; // Use drag-based brush stroke mode
          }
          
          deckLayers.push(new EditableGeoJsonLayer({
            id: `brush-vector-${layer.id}`,
            data: {
              type: 'FeatureCollection',
              features: [] // Always empty - we clear after each stroke
            },
            mode,
            selectedFeatureIndexes: [],
            modeConfig: {
              throttleMs: 16 // ~60fps for smooth brush strokes
            },
            _subLayerProps: {
              tooltips: {
                visible: false
              }
            },
            onEdit: (editInfo) => {
              console.log('🖌️ Brush stroke edit:', editInfo.editType, 'for layer:', layer.id.slice(-8));
              
              // Handle brush stroke completion
              if (editInfo.editType === 'addFeature' && layer.id === selectedLayerId && editInfo.editContext?.strokeComplete) {
                const newFeature = editInfo.updatedData?.features?.[editInfo.updatedData.features.length - 1];
                
                if (newFeature && newFeature.geometry.type === 'LineString') {
                  console.log('🖌️ Processing brush stroke with', newFeature.geometry.coordinates.length, 'points');
                  
                  // Get current brush settings at the time of stroke completion
                  // This ensures fresh values instead of stale closure values
                  const currentBrushSize = brushSize;
                  const currentLabelValue = brushLabelValue;
                  const currentDrawMode = currentMode;
                  
                  console.log('🖌️ Using brush settings:', { 
                    size: currentBrushSize, 
                    labelValue: currentLabelValue, 
                    mode: currentDrawMode 
                  });
                  
                  // Prepare brush stroke for rasterization
                  const brushStroke = {
                    coordinates: newFeature.geometry.coordinates,
                    brushSize: currentBrushSize,
                    labelValue: currentDrawMode === 'brush' ? currentLabelValue : 0, // 0 for eraser
                    mode: currentDrawMode === 'brush' ? 'paint' : 'erase' as 'paint' | 'erase'
                  };
                  
                                                        // Get or create brush rasterizer for this layer
                   if (!brushRasterizersRef.current.get(layer.id) && layer.width && layer.height && layer.bounds) {
                     brushRasterizersRef.current.set(layer.id, new BrushRasterizer({
                       width: layer.width,
                       height: layer.height,
                       bounds: layer.bounds
                     }));
                   }
                   
                   const rasterizer = brushRasterizersRef.current.get(layer.id);
                   if (rasterizer && layer.bounds) {
                     // Initialize rasterizer with current label data
                     rasterizer.setPixelData(layer.labelData!);
                     
                     // Get actual viewer bounds from the stroke coordinates
                     // For now, use the image bounds as viewer bounds (1:1 mapping)
                     // TODO: Get actual viewer viewport bounds for proper coordinate transformation
                     const viewerBounds: [number, number, number, number] = layer.bounds;
                     const result = rasterizer.rasterizeStroke(brushStroke, viewerBounds, layer.bounds);
                     
                     // Update the layer's label data with incremented version
                     setAnnotationLayers(prev => prev.map(l => {
                       if (l.id === layer.id) {
                         return { 
                           ...l, 
                           labelData: result.data,
                           dataVersion: (l.dataVersion || 0) + 1
                         };
                       }
                       return l;
                     }));
                     
                     // Save to history after brush stroke
                     setTimeout(() => saveToHistory(), 0);
                    
                    console.log('🖌️ Brush stroke rasterized and applied to layer');
                  }
                  
                  // Clear the temporary vector stroke - this should trigger a re-render
                  // We don't store brush strokes as vector features
                }
              }
            },
            getFillColor: currentMode === 'brush' ? [255, 140, 0, 100] : [255, 100, 100, 100], // Orange for brush, red for eraser
            getLineColor: currentMode === 'brush' ? [255, 140, 0, 200] : [255, 100, 100, 200], // Orange for brush, red for eraser
            getLineWidth: 1, // Minimal world coordinate width
            lineWidthMinPixels: brushSize, // Exact pixel width - zoom independent
            lineWidthMaxPixels: brushSize, // Force consistent pixel width at all zoom levels
            pointRadiusMinPixels: Math.max(2, brushSize / 2),
            pickable: true,
          }));
        }
      });
    
    deckLayersRef.current = deckLayers;
    onLayersChange(deckLayers);
    console.log('🔄 Created deck layers:', deckLayers.length);
    console.log('📋 Current state:', { 
      mode: currentMode, 
      shape: currentShape, 
      selectedLayerId: selectedLayerId ? selectedLayerId.slice(-8) : 'none',
      totalLayers: annotationLayers.length 
    });
    console.log('🎯 Layer selection state:', annotationLayers.map(l => ({
      id: l.id.slice(-8),
      selectedIndexes: l.selectedFeatureIndexes,
      featureCount: l.features.length,
      isSelected: l.id === selectedLayerId
    })));
    console.log('🎯 Layers with interaction modes:', 
      deckLayers.map(l => ({
        id: l.id.slice(-8),
        mode: l.props.mode?.name || 'No mode (Label Layer)',
        hasOnClick: !!l.props.onClick,
        hasEditHandles: l.props.mode && l.props.mode !== ViewMode && ((l.props.selectedFeatureIndexes?.length || 0) > 0)
      }))
    );
  }, [annotationLayers, currentMode, selectedLayerId, currentShape, brushSize, brushLabelValue, onLayersChange]);

  // Handle adding annotation layer with type selection
  const [showLayerTypeDialog, setShowLayerTypeDialog] = useState(false);
  
  const handleAddAnnotationLayer = useCallback(() => {
    console.log('🎯 Add annotation layer button clicked!');
    setShowLayerTypeDialog(true);
  }, []);

  const handleCreateLayer = useCallback((layerType: 'vector' | 'label') => {
    const newLayerId = generateLayerId();
    const layerNumber = annotationLayers.length + 1;
    
    const newLayer: AnnotationLayer = {
      id: newLayerId,
      name: layerType === 'vector' ? `Vector ${layerNumber}` : `Labels ${layerNumber}`,
      type: layerType,
      features: [],
      visible: true,
      selectedFeatureIndexes: []
    };

    // Add label-specific properties for label layers
    if (layerType === 'label') {
      // TODO: Get actual image dimensions from the current loaded image
      const width = 1024; // Placeholder - should get from actual image
      const height = 1024; // Placeholder - should get from actual image
      newLayer.labelData = new Uint8Array(width * height); // Initialize with zeros
      newLayer.width = width;
      newLayer.height = height;
      newLayer.bounds = [0, 0, width, height];
      newLayer.dataVersion = 0; // Initialize data version
    }

    setAnnotationLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayerId);
    
    // Auto-switch to appropriate mode based on layer type
    if (layerType === 'vector') {
      setCurrentMode('draw');
    } else {
      setCurrentMode('brush');
    }
    
    setShowLayerTypeDialog(false);
    console.log('Added new annotation layer:', newLayerId, 'type:', layerType);
  }, [annotationLayers.length, generateLayerId]);

  // Auto-switch to view mode when no annotation layers exist
  useEffect(() => {
    if (annotationLayers.length === 0 && (currentMode === 'draw' || currentMode === 'select')) {
      console.log('🔄 No annotation layers - switching to view mode');
      setCurrentMode('view');
      setSelectedLayerId(undefined);
    }
  }, [annotationLayers.length, currentMode]);

  // Handle mode changes
  const handleModeChange = (event: React.MouseEvent<HTMLElement>, newMode: string) => {
    if (newMode !== null) {
      setCurrentMode(newMode as 'view' | 'draw' | 'select' | 'brush' | 'eraser');
    }
  };

  // Handle shape changes
  const handleShapeChange = (event: React.MouseEvent<HTMLElement>, newShape: string) => {
    if (newShape !== null) {
      setCurrentShape(newShape);
    }
  };

  // Handle draw mode changes
  const handleDrawModeChange = (event: React.MouseEvent<HTMLElement>, newDrawMode: string) => {
    if (newDrawMode !== null) {
      setCurrentDrawMode(newDrawMode as any);
    }
  };

  // Handle delete selected features
  const handleDeleteSelected = () => {
    if (selectedLayer && selectedLayer.selectedFeatureIndexes.length > 0) {
      console.log('🗑️ Deleting selected features via button:', selectedLayer.selectedFeatureIndexes);
      
      const newFeatures = selectedLayer.features.filter((_, index) => 
        !selectedLayer.selectedFeatureIndexes.includes(index)
      );
      
      setAnnotationLayers(prev => prev.map(layer =>
        layer.id === selectedLayer.id
          ? { ...layer, features: newFeatures, selectedFeatureIndexes: [] }
          : layer
      ));
    }
  };

  // Handle delete all
  const handleDeleteAll = () => {
    if (selectedLayer) {
      setAnnotationLayers(prev => prev.map(layer =>
        layer.id === selectedLayer.id
          ? { ...layer, features: [], selectedFeatureIndexes: [] }
          : layer
      ));
    }
  };

  // Handle layer selection
  const handleLayerSelect = (layerId: string) => {
    setSelectedLayerId(layerId);
  };

  // Handle layer visibility toggle
  const handleLayerToggleVisibility = (layerId: string) => {
    setAnnotationLayers(prev => prev.map(layer =>
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  };

  // Handle layer deletion
  const handleLayerDelete = (layerId: string) => {
    setAnnotationLayers(prev => prev.filter(layer => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(undefined);
    }
  };

  return (
    <>
      {/* Layer Type Selection Dialog */}
      <Dialog 
        open={showLayerTypeDialog} 
        onClose={() => setShowLayerTypeDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle style={{ backgroundColor: '#2c2c2c', color: 'white' }}>
          Choose Annotation Layer Type
        </DialogTitle>
        <DialogContent style={{ backgroundColor: '#2c2c2c', padding: '20px' }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleCreateLayer('vector')}
                startIcon={<VectorIcon />}
                style={{
                  height: '80px',
                  flexDirection: 'column',
                  borderColor: 'rgba(255, 140, 0, 0.5)',
                  color: 'white'
                }}
              >
                <Typography variant="body2" style={{ marginTop: '8px' }}>
                  Vector
                </Typography>
                <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Shapes & polygons
                </Typography>
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleCreateLayer('label')}
                startIcon={<LabelIcon />}
                style={{
                  height: '80px',
                  flexDirection: 'column',
                  borderColor: 'rgba(255, 140, 0, 0.5)',
                  color: 'white'
                }}
              >
                <Typography variant="body2" style={{ marginTop: '8px' }}>
                  Label
                </Typography>
                <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  Brush painting
                </Typography>
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions style={{ backgroundColor: '#2c2c2c' }}>
          <Button onClick={() => setShowLayerTypeDialog(false)} style={{ color: 'white' }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container direction="column" className={classes.section}>
      {/* Separator before annotations */}
      <Grid item>
        <Divider style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', margin: '8px 0' }} />
      </Grid>
      
      {/* Annotation Tools Header */}
      <Grid item>
        <Grid container justifyContent="space-between" alignItems="center">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
              <IconButton
                style={{
                  backgroundColor: "transparent",
                  marginTop: "2px",
                  color: "rgb(255, 255, 255, 1)",
                  padding: 0
                }}
              >
                <PencilIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" style={{ marginTop: "4px", marginLeft: "5px", color: 'white' }}>
                annotations:
              </Typography>
            </div>
            {selectedLayer && (
              <div style={{ marginLeft: "20px", marginTop: "2px" }}>
                <Typography variant="caption" style={{ 
                  color: 'rgba(255, 140, 0, 0.9)', 
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  → {selectedLayer.name}
                </Typography>
              </div>
            )}
          </div>
          <Tooltip title="Add Annotation Layer">
            <IconButton onClick={handleAddAnnotationLayer} className={classes.addButton}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>
      
      <Grid item>
        <Divider style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', margin: '4px 0' }} />
      </Grid>

      {/* Mode Controls */}
      <Grid item>
        <Typography variant="caption" component="div" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px' }}>
          Mode:
        </Typography>
        <div className={classes.toolGroup}>
          <ToggleButtonGroup
            value={currentMode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="view" className={classes.toggleButton} disabled={annotationLayers.length === 0}>
              <Tooltip title={annotationLayers.length === 0 ? "View Mode (No annotation layers)" : "View Mode"}>
                <CursorIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            
            {/* Vector layer tools */}
            {selectedLayer?.type === 'vector' && (
              <>
                <ToggleButton value="select" className={classes.toggleButton} disabled={annotationLayers.length === 0}>
                  <Tooltip title="Select & Edit Mode - Click to select shapes, drag control points to edit">
                    <SelectIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="draw" className={classes.toggleButton} disabled={annotationLayers.length === 0 || !selectedLayer}>
                  <Tooltip title="Draw Mode - Create vector shapes">
                    <PencilIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </>
            )}
            
            {/* Label layer tools */}
            {selectedLayer?.type === 'label' && (
              <>
                <ToggleButton value="brush" className={classes.toggleButton} disabled={annotationLayers.length === 0 || !selectedLayer}>
                  <Tooltip title="Brush Mode - Paint labels directly">
                    <BrushIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="eraser" className={classes.toggleButton} disabled={annotationLayers.length === 0 || !selectedLayer}>
                  <Tooltip title="Eraser Mode - Erase painted labels">
                    <EraserIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </>
            )}
          </ToggleButtonGroup>
          
                      <Tooltip title={historyIndex <= 0 ? "Undo (No history)" : "Undo (Ctrl+Z / Cmd+Z)"}>
                            <IconButton onClick={handleUndo} className={classes.iconButton} disabled={historyIndex <= 0}>
              <Undo fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={annotationLayers.length === 0 ? "Delete Selected (No annotation layers)" : `Delete Selected (${selectedLayer?.selectedFeatureIndexes?.length || 0})`}>
            <IconButton 
              onClick={handleDeleteSelected} 
              className={classes.iconButton} 
              disabled={annotationLayers.length === 0 || !selectedLayer || (selectedLayer.selectedFeatureIndexes?.length || 0) === 0}
              style={{
                color: (selectedLayer?.selectedFeatureIndexes?.length || 0) > 0 ? '#ff4444' : 'white'
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </Grid>

      {/* Vector Shape Controls */}
      {currentMode === 'draw' && selectedLayer && selectedLayer.type === 'vector' && (
        <Grid item>
          <Typography variant="caption" component="div" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px' }}>
            Shape:
          </Typography>
          <div className={classes.toolGroup}>
            <ToggleButtonGroup
              value={currentShape}
              exclusive
              onChange={handleShapeChange}
              size="small"
            >
              <ToggleButton value="polygon" className={classes.toggleButton}>
                <Tooltip title="Polygon">
                  <PolygonIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="rectangle" className={classes.toggleButton}>
                <Tooltip title="Rectangle">
                  <RectangleIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="point" className={classes.toggleButton}>
                <Tooltip title="Point">
                  <PointIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="line" className={classes.toggleButton}>
                <Tooltip title="Line">
                  <LineIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        </Grid>
      )}

      {/* Label Brush Controls */}
      {(currentMode === 'brush' || currentMode === 'eraser') && selectedLayer && selectedLayer.type === 'label' && (
        <Grid item>
          <Typography variant="caption" component="div" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px' }}>
            {currentMode === 'brush' ? 'Brush Settings:' : 'Eraser Settings:'}
          </Typography>
          <Box className={classes.toolGroup} sx={{ flexDirection: 'column', gap: 1 }}>
            {/* Stroke Size */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px', minWidth: '35px' }}>
                Size:
              </Typography>
              <Slider
                value={brushSize}
                onChange={(_: Event, value: number | number[]) => setBrushSize(value as number)}
                min={1}
                max={50}
                step={1}
                valueLabelDisplay="auto"
                size="small"
                sx={{ 
                  flex: 1,
                  color: currentMode === 'brush' ? 'rgba(255, 140, 0, 0.8)' : 'rgba(255, 100, 100, 0.8)',
                  '& .MuiSlider-valueLabel': {
                    fontSize: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)'
                  }
                }}
              />
              <Typography variant="caption" style={{ color: 'white', fontSize: '10px', minWidth: '25px' }}>
                {brushSize}px
              </Typography>
            </Box>
            
            {/* Label Value - only show for brush mode */}
            {currentMode === 'brush' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px', minWidth: '35px' }}>
                  Label:
                </Typography>
                <Slider
                  value={brushLabelValue}
                  onChange={(_: Event, value: number | number[]) => setBrushLabelValue(value as number)}
                  min={1}
                  max={255}
                  step={1}
                  valueLabelDisplay="auto"
                  size="small"
                  sx={{ 
                    flex: 1,
                    color: 'rgba(255, 140, 0, 0.8)',
                    '& .MuiSlider-valueLabel': {
                      fontSize: '10px',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)'
                    }
                  }}
                />
                <Typography variant="caption" style={{ color: 'white', fontSize: '10px', minWidth: '25px' }}>
                  {brushLabelValue}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      )}

      {/* Annotation Layers */}
      {annotationLayers.length > 0 && (
        <Grid item>
          <Typography variant="caption" component="div" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px' }}>
            Layers ({annotationLayers.length}):
          </Typography>
          <div className={classes.layerList}>
            {annotationLayers.map(layer => (
              <ListItem 
                key={layer.id} 
                className={layer.id === selectedLayerId ? classes.selectedLayerItem : classes.layerItem} 
                disablePadding
              >
                <ListItemButton
                  selected={layer.id === selectedLayerId}
                  onClick={() => handleLayerSelect(layer.id)}
                  sx={{
                    padding: '4px 8px',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255, 140, 0, 0.3)',
                    }
                  }}
                >
                  <ListItemIcon style={{ minWidth: '24px' }}>
                    {layer.type === 'vector' ? (
                      <VectorIcon style={{ color: 'white', fontSize: '16px' }} />
                    ) : (
                      <LabelIcon style={{ color: 'white', fontSize: '16px' }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography style={{ 
                        color: layer.id === selectedLayerId ? 'rgba(255, 140, 0, 1)' : 'white', 
                        fontSize: '12px',
                        fontWeight: layer.id === selectedLayerId ? 'bold' : 'normal'
                      }}>
                        {layer.id === selectedLayerId ? '● ' : ''}{layer.name}
                      </Typography>
                    }
                    secondary={
                      <Box display="flex" gap={0.5}>
                        <Chip
                          label={layer.type === 'vector' ? `${layer.features.length} features` : 'Label layer'}
                          className={classes.layerChip}
                          size="small"
                        />
                        {layer.selectedFeatureIndexes.length > 0 && (
                          <Chip
                            label={`${layer.selectedFeatureIndexes.length} selected`}
                            size="small"
                            style={{
                              height: '20px',
                              fontSize: '10px',
                              backgroundColor: 'rgba(255, 200, 0, 0.8)',
                              color: 'black',
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <Box display="flex" gap={0.5}>
                    <Tooltip title={layer.visible ? "Hide" : "Show"}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLayerToggleVisibility(layer.id);
                        }}
                        style={{ color: 'white', padding: '2px' }}
                      >
                        {layer.visible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Layer">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLayerDelete(layer.id);
                        }}
                        style={{ color: 'white', padding: '2px' }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </div>
        </Grid>
      )}
    </Grid>
    </>
  );
};

export default AnnotationSection; 