import { AccordionSummary, Typography } from "@mui/material";
import { withStyles } from "@mui/styles";
import React from "react";
import LayerVisibilityButton from "./LayerVisibilityButton";

import { useSourceData } from "../../hooks";

const DenseAccordionSummary = withStyles({
  root: {
    borderBottom: "1px solid rgba(150, 150, 150, .125)",
    backgroundColor: "rgba(150, 150, 150, 0.25)",
    display: "block",
    padding: "0 8px",
    height: 32,
    minHeight: 32,
    overflow: "hidden",
    transition: "none",
    "&$expanded": {
      minHeight: 32,
    },
  },
  content: {
    margin: 0,
    "&$expanded": {
      margin: 0,
    },
  },
  expanded: {},
})(AccordionSummary);

function Header({ name }: { name: string }) {
  const [sourceData] = useSourceData();
  const label = `layer-controller-${sourceData.id}`;
  return (
    <DenseAccordionSummary aria-controls={label} id={label}>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <LayerVisibilityButton />
        <Typography style={{ marginTop: "4px", marginLeft: "5px" }} variant="body2">
          {name}
        </Typography>
      </div>
    </DenseAccordionSummary>
  );
}

export default Header;
