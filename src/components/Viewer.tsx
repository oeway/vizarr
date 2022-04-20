import React, { useRef } from 'react';
import { useAtom } from 'jotai';
import { useAtomValue } from 'jotai/utils';
import DeckGL from 'deck.gl';
import { OrthographicView } from '@deck.gl/core';
import type { Layer } from '@deck.gl/core';
import { CircularProgress, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

import type { LayerState } from '../state';
import { layerAtoms, viewStateAtom, loadingAtom, sourceInfoAtom } from '../state';
import { isInterleaved, fitBounds } from '../utils';
import logo from '../../public/logo-wide.png';

const useStyles = makeStyles({
  loadingIcon: {
    position: 'absolute',
    left: 'calc(50vw - 20px)',
    top: 'calc(50vh - 20px)',
    color: 'white',
  },
  loadingText: {
    position: 'absolute',
    left: '50vw',
    top: 'calc(50vh + 45px)',
    color: 'white',
    transform: 'translate(-50%, -50%)',
  },
  floatingLogo: {
    position: 'absolute',
    left: '50vw',
    top: '50vh',
    color: 'white',
    width: '200px',
    maxWidth: '100%',
    transform: 'translate(-50%, -50%)',
  },
});

function getLayerSize(props: LayerState['layerProps']) {
  const { loader } = props;
  const [base, maxZoom] = Array.isArray(loader) ? [loader[0], loader.length] : [loader, 0];
  const interleaved = isInterleaved(base.shape);
  let [height, width] = base.shape.slice(interleaved ? -3 : -2);
  if ('loaders' in props && props.rows && props.columns) {
    // TODO: Don't hardcode spacer size. Probably best to inspect the deck.gl Layers rather than
    // the Layer Props.
    const spacer = 5;
    height = (height + spacer) * props.rows;
    width = (width + spacer) * props.columns;
  }
  return { height, width, maxZoom };
}

function WrappedViewStateDeck({ layers }: { layers: Layer<any, any>[] }) {
  const [viewState, setViewState] = useAtom(viewStateAtom);
  const loading = useAtomValue(loadingAtom);
  const deckRef = useRef<DeckGL>(null);
  const classes = useStyles();
  const sourceInfo = useAtomValue(sourceInfoAtom);

  // If viewState hasn't been updated, use the first loader to guess viewState
  // TODO: There is probably a better place / way to set the intital view and this is a hack.
  if (deckRef.current && viewState?.default && layers[0]?.props?.loader) {
    const { deck } = deckRef.current;
    const { width, height, maxZoom } = getLayerSize(layers[0].props);
    const padding = deck.width < 400 ? 10 : deck.width < 600 ? 30 : 50; // Adjust depending on viewport width.
    const { zoom, target } = fitBounds([width, height], [deck.width, deck.height], maxZoom, padding);
    setViewState({ zoom, target });
  }

  return (
    <>
      <img
        className={classes.floatingLogo}
        style={{ visibility: Object.keys(sourceInfo).length > 0 || loading ? 'hidden' : 'visible' }}
        src={logo}
        alt="logo"
      ></img>
      <CircularProgress className={classes.loadingIcon} style={{ visibility: loading ? 'visible' : 'hidden' }} />
      {typeof loading === 'string' ? (
        <Typography className={classes.loadingText} variant="h6">
          {loading}
        </Typography>
      ) : (
        ''
      )}
      <DeckGL
        ref={deckRef}
        layers={layers}
        viewState={viewState}
        onViewStateChange={(e) => setViewState(e.viewState)}
        views={[new OrthographicView({ id: 'ortho', controller: true })]}
      />
    </>
  );
}

function Viewer() {
  const layerConstructors = useAtomValue(layerAtoms);
  const layers = layerConstructors.map((layer) => {
    return !layer.on ? null : new layer.Layer(layer.layerProps);
  });
  return <WrappedViewStateDeck layers={layers as Layer<any, any>[]} />;
}

export default Viewer;
