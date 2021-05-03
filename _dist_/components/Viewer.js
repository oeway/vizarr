import React, {useRef} from "../../_snowpack/pkg/react.js";
import {useRecoilState, useRecoilValue} from "../../_snowpack/pkg/recoil.js";
import DeckGL from "../../_snowpack/pkg/deck.gl.js";
import {OrthographicView} from "../../_snowpack/pkg/@deck.gl/core.js";
import {CircularProgress, Typography} from "../../_snowpack/pkg/@material-ui/core.js";
import {makeStyles} from "../../_snowpack/pkg/@material-ui/styles.js";
import {viewerViewState, layersSelector, sourceInfoState, loadingState} from "../state.js";
import {isInterleaved, fitBounds} from "../utils.js";
import logo from "./logo-wide.png.proxy.js";
const useStyles = makeStyles({
  loadingIcon: {
    position: "absolute",
    left: "calc(50vw - 20px)",
    top: "calc(50vh - 20px)",
    color: "white"
  },
  loadingText: {
    position: "absolute",
    left: "50vw",
    top: "calc(50vh + 45px)",
    color: "white",
    transform: "translate(-50%, -50%)"
  },
  floatingLogo: {
    position: "absolute",
    left: "50vw",
    top: "50vh",
    color: "white",
    width: "200px",
    maxWidth: "100%",
    transform: "translate(-50%, -50%)"
  }
});
function getLayerSize(props) {
  const {loader, rows, columns} = props;
  const [base, maxZoom] = Array.isArray(loader) ? [loader[0], loader.length] : [loader, 0];
  const interleaved = isInterleaved(base.shape);
  let [height, width] = base.shape.slice(interleaved ? -3 : -2);
  if (rows && columns) {
    const spacer = 5;
    height = (height + spacer) * rows;
    width = (width + spacer) * columns;
  }
  return {height, width, maxZoom};
}
function WrappedViewStateDeck({layers}) {
  const [viewState, setViewState] = useRecoilState(viewerViewState);
  const deckRef = useRef(null);
  const views = [new OrthographicView({id: "ortho", controller: true})];
  const sourceInfo = useRecoilValue(sourceInfoState);
  const loading = useRecoilValue(loadingState);
  const classes = useStyles();
  if (deckRef.current && viewState?.default && layers[0]?.props?.loader) {
    const {deck} = deckRef.current;
    const {width, height, maxZoom} = getLayerSize(layers[0].props);
    const padding = deck.width < 400 ? 10 : deck.width < 600 ? 30 : 50;
    const {zoom, target} = fitBounds([width, height], [deck.width, deck.height], maxZoom, padding);
    setViewState({zoom, target});
  }
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("img", {
    className: classes.floatingLogo,
    style: {visibility: Object.keys(sourceInfo).length > 0 || loading ? "hidden" : "visible"},
    src: logo,
    alt: "logo"
  }), /* @__PURE__ */ React.createElement(CircularProgress, {
    className: classes.loadingIcon,
    style: {visibility: loading ? "visible" : "hidden"}
  }), /* @__PURE__ */ React.createElement(Typography, {
    className: classes.loadingText,
    style: {visibility: typeof loading === "string" ? "visible" : "hidden"},
    variant: "h6"
  }, loading), /* @__PURE__ */ React.createElement(DeckGL, {
    ref: deckRef,
    layers,
    viewState,
    onViewStateChange: (e) => setViewState(e.viewState),
    views
  }));
}
function Viewer() {
  const layerConstructors = useRecoilValue(layersSelector);
  const layers = layerConstructors.map((l) => {
    const {Layer, layerProps, on} = l;
    return !Layer || !on ? null : new Layer(layerProps);
  });
  return /* @__PURE__ */ React.createElement(WrappedViewStateDeck, {
    layers
  });
}
export default Viewer;
