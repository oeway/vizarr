import { DrawPolygonMode, ViewMode } from "@deck.gl-community/editable-layers";
import { Edit as PencilIcon, Stop } from "@mui/icons-material";
import { Box, IconButton, Tooltip } from "@mui/material";
import { makeStyles } from "@mui/styles";
import React, { useState, useCallback } from "react";
import { createAnnotationLayer } from "./layers/AnnotationLayer";

const useStyles = makeStyles({
  root: {
    position: "absolute",
    top: "50px", // Position below the main menu
    left: "5px",
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: "5px",
    padding: "5px",
  },
  activeButton: {
    backgroundColor: "rgba(255, 140, 0, 0.3) !important",
  },
});

interface AnnotationControllerProps {
  onFeaturesChange?: (features: GeoJSON.FeatureCollection) => void;
  onLayerChange?: (layer: any) => void;
}

const AnnotationController: React.FC<AnnotationControllerProps> = ({ onFeaturesChange, onLayerChange }) => {
  const classes = useStyles();
  const [isDrawing, setIsDrawing] = useState(false);
  const [features, setFeatures] = useState<any>({
    type: "FeatureCollection",
    features: [],
  });

  const handlePencilClick = useCallback(() => {
    setIsDrawing(!isDrawing);
  }, [isDrawing]);

  const handleEdit = useCallback(
    (editResult: any) => {
      console.log("=== EDIT EVENT ===", editResult);
      const { updatedData, editType, editContext } = editResult;

      // Always update features first
      setFeatures(updatedData);
      onFeaturesChange?.(updatedData);

      // Check if a polygon was just completed
      if (isDrawing) {
        // In DrawPolygonMode, completion can be detected by:
        // 1. editType === 'addFeature' (most reliable)
        // 2. Feature count increased
        // 3. editContext might have completion info

        const previousFeatureCount = features.features.length;
        const newFeatureCount = updatedData.features.length;

        if (editType === "addFeature" || newFeatureCount > previousFeatureCount) {
          console.log("Polygon completed! Switching to view mode");
          console.log(`Features: ${previousFeatureCount} → ${newFeatureCount}`);

          // Switch back to view mode after completing a polygon
          setTimeout(() => {
            setIsDrawing(false);
          }, 50); // Shorter timeout
        }
      }
    },
    [onFeaturesChange, isDrawing, features.features.length],
  );

  // Get the current mode based on drawing state
  const currentMode = isDrawing ? DrawPolygonMode : ViewMode;

  // Create the annotation layer using useMemo to avoid unnecessary recreations
  const annotationLayer = React.useMemo(() => {
    return createAnnotationLayer({
      initialFeatures: features,
      onEdit: handleEdit,
      mode: currentMode,
      visible: true,
      pickable: true,
      selectedFeatureIndexes: [],
    });
  }, [features, currentMode, handleEdit]);

  // Pass the layer to parent when it changes
  React.useEffect(() => {
    onLayerChange?.(annotationLayer);
  }, [annotationLayer, onLayerChange]);

  return (
    <Box className={classes.root}>
      <Tooltip title={isDrawing ? "Stop drawing polygons" : "Draw polygons"}>
        <IconButton
          onClick={handlePencilClick}
          className={isDrawing ? classes.activeButton : ""}
          style={{
            color: "white",
            padding: "8px",
          }}
        >
          {isDrawing ? <Stop /> : <PencilIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default AnnotationController;
