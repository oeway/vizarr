import React, { useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import DeckGL from 'deck.gl';
import { OrthographicView } from '@deck.gl/core';
import type { Layer } from '@deck.gl/core';
import { CircularProgress, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

import { viewerViewState, layersSelector, LayerState, sourceInfoState, loadingState } from '../state';
import { isInterleaved, fitBounds } from '../utils';
import logo from './logo-wide.png';

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
  const { loader, rows, columns } = props;
  const [base, maxZoom] = Array.isArray(loader) ? [loader[0], loader.length] : [loader, 0];
  const interleaved = isInterleaved(base.shape);
  let [height, width] = base.shape.slice(interleaved ? -3 : -2);
  if (rows && columns) {
    // TODO: Don't hardcode spacer size. Probably best to inspect the deck.gl Layers rather than
    // the Layer Props.
    const spacer = 5;
    height = (height + spacer) * rows;
    width = (width + spacer) * columns;
  }
  return { height, width, maxZoom };
}

function WrappedViewStateDeck({ layers }: { layers: Layer<any, any>[] }): JSX.Element {
  const [viewState, setViewState] = useRecoilState(viewerViewState);
  const deckRef = useRef<DeckGL>(null);
  const views = [new OrthographicView({ id: 'ortho', controller: true })];
  const sourceInfo = useRecoilValue(sourceInfoState);
  const loading = useRecoilValue(loadingState);
  const classes = useStyles();

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
      <Typography
        className={classes.loadingText}
        style={{ visibility: typeof loading === 'string' ? 'visible' : 'hidden' }}
        variant="h6"
      >
        {loading}
      </Typography>
      <DeckGL
        ref={deckRef}
        layers={layers}
        viewState={viewState}
        onViewStateChange={(e) => setViewState(e.viewState)}
        views={views}
      />
    </>
  );
}

function Viewer(): JSX.Element {
  const layerConstructors = useRecoilValue(layersSelector);
  const layers = layerConstructors.map((l) => {
    // Something weird with Recoil Loadable here. Need to cast to any.
    const { Layer, layerProps, on } = l as any;
    return !Layer || !on ? null : new Layer(layerProps);
  });
  return <WrappedViewStateDeck layers={layers} />;
}

export default Viewer;
