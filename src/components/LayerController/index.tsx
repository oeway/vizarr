import MuiAccordion from "@mui/material/Accordion";
import { withStyles } from "@mui/styles";
import React from "react";

import { LayerStateContext, useSourceData } from "../../hooks";
import { layerFamilyAtom } from "../../state";
import Content from "./Content";
import Header from "./Header";

const Accordion = withStyles({
  root: {
    borderBottom: "1px solid rgba(150, 150, 150, .2)",
    width: 240,
    maxWidth: 240,
    minWidth: 240,
    boxshadow: "none",
    overflow: "hidden", // Prevent content from overflowing
    "&:not(:last-child)": {
      borderBottom: 0,
    },
    "&:before": {
      display: "none",
    },
    "&$expanded": {
      margin: 0,
      padding: 0,
    },
  },
  expanded: {
    padding: 1,
  },
})(MuiAccordion);

interface LayerControllerProps {
  onAnnotationLayersChange?: (layers: any[]) => void;
}

function LayerController({ onAnnotationLayersChange }: LayerControllerProps = {}) {
  const [sourceInfo] = useSourceData();
  const layerAtom = layerFamilyAtom(sourceInfo);
  return (
    <LayerStateContext.Provider value={layerAtom}>
      <Accordion defaultExpanded>
        <Header name={sourceInfo.name ?? ""} />
        <Content onAnnotationLayersChange={onAnnotationLayersChange} />
      </Accordion>
    </LayerStateContext.Provider>
  );
}

export default LayerController;
