// Custom polygon drag mode based on deck.gl-community DrawPolygonByDraggingMode
// Enables drag-to-draw functionality for polygon annotation tools

import { GeoJsonEditMode } from "@deck.gl-community/editable-layers";
import type {
  ClickEvent,
  DraggingEvent,
  GuideFeatureCollection,
  ModeProps,
  StartDraggingEvent,
  StopDraggingEvent,
  Tooltip,
} from "@deck.gl-community/editable-layers";
import type { Polygon, Position } from "@deck.gl-community/editable-layers";
import throttle from "lodash.throttle";

type DraggingHandler = (event: DraggingEvent, props: ModeProps<any>) => void;

export class DrawPolygonByDraggingMode extends GeoJsonEditMode {
  handleDraggingThrottled: DraggingHandler | null | undefined = null;
  private polygonPoints: Position[] = [];
  private isDrawing = false;
  private minPointsForPolygon = 3;

  // Disable click-based interaction for drag mode
  handleClick(event: ClickEvent, props: ModeProps<any>) {
    // No-op - drag mode uses drag only
  }

  handleStartDragging(event: StartDraggingEvent, props: ModeProps<any>) {
    // Prevent map panning while drawing
    event.cancelPan();

    // Start a new polygon
    this.polygonPoints = [event.mapCoords];
    this.isDrawing = true;
    this.resetClickSequence();

    // Set up throttled dragging for performance
    const throttleMs = props.modeConfig?.throttleMs || 16; // ~60fps default
    this.handleDraggingThrottled = throttle(this.handleDraggingAux.bind(this), throttleMs);

    console.log("🔺 Started polygon drag at:", event.mapCoords);
  }

  handleDragging(event: DraggingEvent, props: ModeProps<any>) {
    if (this.handleDraggingThrottled && this.isDrawing) {
      this.handleDraggingThrottled(event, props);
    }
  }

  handleDraggingAux(event: DraggingEvent, props: ModeProps<any>) {
    if (!this.isDrawing) return;

    // Add point if it's far enough from the last point (avoid duplicate points)
    const lastPoint = this.polygonPoints[this.polygonPoints.length - 1];
    const distance = this.calculateDistance(lastPoint, event.mapCoords);
    
    // Only add point if it's at least 5 pixels away (in map units)
    const minDistance = 0.001; // Adjust based on your coordinate system
    if (distance > minDistance) {
      this.polygonPoints.push(event.mapCoords);
    }

    // Emit intermediate update for real-time preview
    props.onEdit({
      updatedData: props.data,
      editType: "addTentativePosition",
      editContext: {
        position: event.mapCoords,
        polygonDrag: true,
        pointCount: this.polygonPoints.length,
      },
    });
  }

  handleStopDragging(event: StopDraggingEvent, props: ModeProps<any>) {
    if (!this.isDrawing) return;

    console.log("🔺 Stopped polygon drag");

    // Cancel throttled function
    if (this.handleDraggingThrottled && (this.handleDraggingThrottled as any).cancel) {
      (this.handleDraggingThrottled as any).cancel();
    }

    // Add the final point
    const lastPoint = this.polygonPoints[this.polygonPoints.length - 1];
    const distance = this.calculateDistance(lastPoint, event.mapCoords);
    if (distance > 0.001) {
      this.polygonPoints.push(event.mapCoords);
    }

    // Check if we have enough points for a valid polygon
    if (this.polygonPoints.length >= this.minPointsForPolygon) {
      // Close the polygon by adding the first point as the last point
      const closedCoordinates = [...this.polygonPoints, this.polygonPoints[0]];

      // Create the completed polygon
      const polygon: Polygon = {
        type: "Polygon",
        coordinates: [closedCoordinates],
      };

      console.log("🔺 Completing polygon with", this.polygonPoints.length, "points");

      // Emit the completed polygon
      const editAction = this.getAddFeatureAction(polygon, props.data);
      if (editAction) {
        props.onEdit({
          ...editAction,
          editContext: {
            ...editAction.editContext,
            polygonDrag: true,
            polygonComplete: true,
          },
        });
      }
    } else {
      console.log("🔺 Polygon cancelled - not enough points");
      props.onEdit({
        updatedData: props.data,
        editType: "cancelFeature",
        editContext: { polygonDrag: true, reason: "insufficient_points" },
      });
    }

    // Reset for next polygon
    this.resetState();
  }

  // Handle keyboard shortcuts
  handleKeyUp(event: KeyboardEvent, props: ModeProps<any>) {
    if (event.key === "Escape") {
      console.log("🔺 Cancelled polygon drag");
      this.resetState();

      if (this.handleDraggingThrottled) {
        this.handleDraggingThrottled = null;
      }

      props.onEdit({
        updatedData: props.data,
        editType: "cancelFeature",
        editContext: { polygonDrag: true, reason: "user_cancelled" },
      });
    }
  }

  // Provide visual guides for the current polygon
  getGuides(props: ModeProps<any>): GuideFeatureCollection {
    const { lastPointerMoveEvent } = props;
    const guides: GuideFeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };

    // Show the current polygon as tentative lines
    if (this.isDrawing && this.polygonPoints.length > 0) {
      const currentCoords = lastPointerMoveEvent 
        ? [...this.polygonPoints, lastPointerMoveEvent.mapCoords] 
        : this.polygonPoints;

      // Show the current drawing path
      if (currentCoords.length > 1) {
        const tentativeLine = {
          type: "Feature" as const,
          properties: {
            guideType: "tentative" as const,
            polygonDrag: true,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: currentCoords,
          },
        };
        guides.features.push(tentativeLine);
      }

      // Show closing line if we have enough points
      if (currentCoords.length >= this.minPointsForPolygon && lastPointerMoveEvent) {
        const closingLine = {
          type: "Feature" as const,
          properties: {
            guideType: "tentative" as const,
            polygonDrag: true,
            isClosingLine: true,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: [lastPointerMoveEvent.mapCoords, this.polygonPoints[0]],
          },
        };
        guides.features.push(closingLine);
      }
    }

    return guides;
  }

  // Update cursor for polygon drag mode
  handlePointerMove(event: any, props: ModeProps<any>) {
    props.onUpdateCursor(this.isDrawing ? "crosshair" : "copy");
  }

  // Show helpful tooltips
  getTooltips(props: ModeProps<any>): Tooltip[] {
    if (!this.isDrawing) {
      return [
        {
          position: props.lastPointerMoveEvent?.mapCoords || [0, 0],
          text: "Drag to draw polygon",
        },
      ];
    }

    if (this.polygonPoints.length < this.minPointsForPolygon) {
      return [
        {
          position: props.lastPointerMoveEvent?.mapCoords || [0, 0],
          text: `Keep dragging (${this.polygonPoints.length}/${this.minPointsForPolygon} min points)`,
        },
      ];
    }

    return [
      {
        position: props.lastPointerMoveEvent?.mapCoords || [0, 0],
        text: `Release to complete polygon (${this.polygonPoints.length} points)`,
      },
    ];
  }

  private resetState() {
    this.polygonPoints = [];
    this.isDrawing = false;
    this.resetClickSequence();
  }

  private calculateDistance(point1: Position, point2: Position): number {
    const dx = point1[0] - point2[0];
    const dy = point1[1] - point2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
} 