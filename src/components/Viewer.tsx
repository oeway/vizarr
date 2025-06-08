import DeckGL from "deck.gl";
import { OrthographicView } from "deck.gl";
import { useAtomValue } from "jotai/utils";
import * as React from "react";
import { useViewState } from "../hooks";
import { layerAtoms } from "../state";
import { fitImageToViewport, isGridLayerProps, isInterleaved, resolveLoaderFromLayerProps } from "../utils";
import Menu from "./Menu";

import type { DeckGLRef, OrthographicViewState } from "deck.gl";
import type { VizarrLayer } from "../state";

export default function Viewer() {
  const deckRef = React.useRef<DeckGLRef>(null);
  const [viewState, setViewState] = useViewState();
  const layers = useAtomValue(layerAtoms);
  const firstLayer = layers[0];
  const [annotationLayers, setAnnotationLayers] = React.useState<any[]>([]);

  // If viewState hasn't been updated, use the first loader to guess viewState
  // TODO: There is probably a better place / way to set the intital view and this is a hack.
  if (deckRef.current?.deck && !viewState && firstLayer) {
    const { deck } = deckRef.current;
    setViewState(
      fitImageToViewport({
        image: getLayerSize(firstLayer),
        viewport: deck,
        padding: deck.width < 400 ? 10 : deck.width < 600 ? 30 : 50, // Adjust depending on viewport width.
        matrix: firstLayer.props.modelMatrix,
      }),
    );
  }

  // Enables screenshots of the canvas: https://github.com/visgl/deck.gl/issues/2200
  const glOptions: WebGLContextAttributes = {
    preserveDrawingBuffer: true,
  };

  // Combine vizarr layers with annotation layers
  const allLayers = [...layers, ...annotationLayers];

  const handleAnnotationLayersChange = React.useCallback((newLayers: any[]) => {
    setAnnotationLayers(newLayers);
    console.log('Annotation layers updated:', newLayers.length);
  }, []);

  return (
    <>
      <DeckGL
        ref={deckRef}
        layers={allLayers}
        viewState={viewState && { ortho: viewState }}
        onViewStateChange={(e: { viewState: OrthographicViewState }) =>
          // @ts-expect-error - deck doesn't know this should be ok
          setViewState(e.viewState)
        }
        views={[new OrthographicView({ id: "ortho", controller: true })]}
        glOptions={glOptions}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          zIndex: '0',
          overflow: 'hidden'
        }}
      />
      <Menu onAnnotationLayersChange={handleAnnotationLayersChange} />
    </>
  );
}

function getLayerSize({ props }: VizarrLayer) {
  const loader = resolveLoaderFromLayerProps(props);
  const [baseResolution, maxZoom] = Array.isArray(loader) ? [loader[0], loader.length] : [loader, 0];
  const interleaved = isInterleaved(baseResolution.shape);
  let [height, width] = baseResolution.shape.slice(interleaved ? -3 : -2);
  if (isGridLayerProps(props)) {
    // TODO: Don't hardcode spacer size. Probably best to inspect the deck.gl Layers rather than
    // the Layer Props.
    const spacer = 5;
    height = (height + spacer) * props.rows;
    width = (width + spacer) * props.columns;
  }
  return { height, width, maxZoom };
}
