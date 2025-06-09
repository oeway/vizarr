// Custom brush stroke mode based on deck.gl-community DrawPolygonByDraggingMode
// Enables drag-to-paint functionality for brush annotation tools

import throttle from 'lodash.throttle';
import { GeoJsonEditMode } from '@deck.gl-community/editable-layers';
import type {
  ClickEvent,
  StartDraggingEvent,
  StopDraggingEvent,
  DraggingEvent,
  ModeProps,
  GuideFeatureCollection,
  Tooltip
} from '@deck.gl-community/editable-layers';
import type { LineString } from '@deck.gl-community/editable-layers';

type DraggingHandler = (event: DraggingEvent, props: ModeProps<any>) => void;

export class DrawBrushStrokeMode extends GeoJsonEditMode {
  handleDraggingThrottled: DraggingHandler | null | undefined = null;

  // Disable click-based interaction for brush mode
  handleClick(event: ClickEvent, props: ModeProps<any>) {
    // No-op - brush uses drag only
  }

  handleStartDragging(event: StartDraggingEvent, props: ModeProps<any>) {
    // Prevent map panning while brushing
    event.cancelPan();
    
    // Start a new brush stroke
    this.resetClickSequence();
    this.addClickSequence(event);
    
    // Set up throttled dragging for performance
    const throttleMs = props.modeConfig?.throttleMs || 16; // ~60fps default
    this.handleDraggingThrottled = throttle(this.handleDraggingAux.bind(this), throttleMs);
    
    console.log('🖌️ Started brush stroke at:', event.mapCoords);
  }

  handleDragging(event: DraggingEvent, props: ModeProps<any>) {
    if (this.handleDraggingThrottled) {
      this.handleDraggingThrottled(event, props);
    }
  }

  handleDraggingAux(event: DraggingEvent, props: ModeProps<any>) {
    // Add points continuously while dragging
    this.addClickSequence(event);
    
    // Emit intermediate update for real-time preview
    props.onEdit({
      updatedData: props.data,
      editType: 'addTentativePosition',
      editContext: { 
        position: event.mapCoords,
        brushStroke: true
      }
    });
  }

  handleStopDragging(event: StopDraggingEvent, props: ModeProps<any>) {
    console.log('🖌️ Stopped brush stroke');
    
    // Cancel throttled function
    if (this.handleDraggingThrottled && (this.handleDraggingThrottled as any).cancel) {
      (this.handleDraggingThrottled as any).cancel();
    }
    
    // Add the final point
    this.addClickSequence(event);
    const clickSequence = this.getClickSequence();
    
    if (clickSequence.length > 1) {
      // Create the completed brush stroke as a LineString
      const brushStroke: LineString = {
        type: 'LineString',
        coordinates: [...clickSequence]
      };
      
      console.log('🖌️ Completing brush stroke with', clickSequence.length, 'points');
      
      // Emit the completed stroke
      const editAction = this.getAddFeatureAction(brushStroke, props.data);
      if (editAction) {
        props.onEdit({
          ...editAction,
          editContext: {
            ...editAction.editContext,
            brushStroke: true,
            strokeComplete: true
          }
        });
      }
    }
    
    // Reset for next stroke
    this.resetClickSequence();
  }

  // Handle keyboard shortcuts
  handleKeyUp(event: KeyboardEvent, props: ModeProps<any>) {
    if (event.key === 'Escape') {
      console.log('🖌️ Cancelled brush stroke');
      this.resetClickSequence();
      
      if (this.handleDraggingThrottled) {
        this.handleDraggingThrottled = null;
      }
      
      props.onEdit({
        updatedData: props.data,
        editType: 'cancelFeature',
        editContext: { brushStroke: true }
      });
    }
  }

  // Provide visual guides for the current stroke
  getGuides(props: ModeProps<any>): GuideFeatureCollection {
    const { lastPointerMoveEvent } = props;
    const clickSequence = this.getClickSequence();
    
    const guides: GuideFeatureCollection = {
      type: 'FeatureCollection',
      features: []
    };

    // Show the current brush stroke as a tentative line
    if (clickSequence.length > 0) {
      const currentCoords = lastPointerMoveEvent ? [...clickSequence, lastPointerMoveEvent.mapCoords] : clickSequence;
      
      const tentativeStroke = {
        type: 'Feature' as const,
        properties: {
          guideType: 'tentative' as const,
          brushStroke: true
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: currentCoords
        }
      };
      
      guides.features.push(tentativeStroke);
    }

    return guides;
  }

  // Update cursor for brush mode
  handlePointerMove(event: any, props: ModeProps<any>) {
    props.onUpdateCursor('crosshair');
  }

  // Disable tooltips for brush mode (they interfere with painting)
  getTooltips(props: ModeProps<any>): Tooltip[] {
    return [];
  }
} 