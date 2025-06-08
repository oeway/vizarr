import { Grid, IconButton } from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";
import { useAtomValue } from "jotai/utils";
import React, { useReducer } from "react";

import { SourceDataContext } from "../hooks";
import { sourceInfoAtomAtoms } from "../state";
import LayerController from "./LayerController";

const useStyles = makeStyles({
  root: {
    zIndex: 1,
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: "5px",
    left: "5px",
    top: "5px",
  },
  scroll: {
    maxHeight: "calc(100vh - 20px)", // Allow expansion to almost full viewport height
    overflowX: "hidden",
    overflowY: "auto", // Enable scrolling when content exceeds maxHeight
    "&::-webkit-scrollbar": {
      display: "none",
      background: "transparent",
    },
    scrollbarWidth: "none",
    flexDirection: "column",
  },
});

interface MenuProps {
  open?: boolean;
  onAnnotationLayersChange?: (layers: any[]) => void;
}

function Menu({ open, onAnnotationLayersChange }: MenuProps) {
  const sourceAtoms = useAtomValue(sourceInfoAtomAtoms);
  const [hidden, toggle] = useReducer((v) => !v, !(open ?? true));
  const classes = useStyles();
  return (
    <div className={classes.root} style={{ padding: `0px 5px ${hidden ? 0 : 5}px 5px` }}>
      <Grid container direction="column" alignItems="flex-start">
        <IconButton style={{ backgroundColor: "transparent", padding: 0 }} onClick={toggle}>
          {hidden ? <Add /> : <Remove />}
        </IconButton>
        <div className={classes.scroll} style={{ display: hidden ? "none" : "flex" }}>
          {sourceAtoms.map((sourceAtom) => (
            <SourceDataContext.Provider key={`${sourceAtom}`} value={sourceAtom}>
              <LayerController onAnnotationLayersChange={onAnnotationLayersChange} />
            </SourceDataContext.Provider>
          ))}
        </div>
      </Grid>
    </div>
  );
}

export default Menu;
