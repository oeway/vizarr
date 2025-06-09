import { AccordionDetails, Divider, Grid, Typography } from "@mui/material";
import { withStyles } from "@mui/styles";
import React from "react";

import AcquisitionController from "./AcquisitionController";
import AddChannelButton from "./AddChannelButton";
import AnnotationSection from "./AnnotationSection";
import AxisSliders from "./AxisSliders";
import ChannelController from "./ChannelController";
import Labels from "./Labels";
import OpacitySlider from "./OpacitySlider";

import { useLayerState } from "../../hooks";
import { range } from "../../utils";

const Details = withStyles({
  root: {
    padding: "8px 10px",
    borderLeft: "1px solid rgba(150, 150, 150, .2)",
    borderRight: "1px solid rgba(150, 150, 150, .2)",
    overflow: "hidden", // Prevent content overflow
    maxWidth: "100%",
    boxSizing: "border-box",
  },
})(AccordionDetails);

interface ContentProps {
  onAnnotationLayersChange?: (layers: any[]) => void;
}

function Content({ onAnnotationLayersChange }: ContentProps = {}) {
  const [layer] = useLayerState();
  const nChannels = layer.layerProps.selections.length;

  return (
    <Details>
      <Grid container direction="column">
        <Grid item>
          <AcquisitionController />
        </Grid>
        <Grid item>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item xs={3}>
              <Typography variant="caption">opacity:</Typography>
            </Grid>
            <Grid item xs={8}>
              <OpacitySlider />
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          <AxisSliders />
        </Grid>
        <Grid item>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item xs={3}>
              <Typography variant="caption">channels:</Typography>
            </Grid>
            <Grid item xs={1}>
              <AddChannelButton />
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          <Divider />
        </Grid>
        <Grid item>
          {range(nChannels).map((i) => (
            <ChannelController channelIndex={i} key={i} />
          ))}
        </Grid>
        {layer.labels?.length && (
          <>
            <Grid item>
              <Grid container justifyContent="space-between">
                <Typography variant="caption">labels:</Typography>
              </Grid>
            </Grid>
            <Grid item>
              <Divider />
            </Grid>
            <Grid item>
              {layer.labels.map((label, i) => (
                <Labels labelIndex={i} key={label.layerProps.id} />
              ))}
            </Grid>
          </>
        )}

        {/* Annotation Section */}
        {onAnnotationLayersChange && (
          <Grid item>
            <AnnotationSection onLayersChange={onAnnotationLayersChange} />
          </Grid>
        )}
      </Grid>
    </Details>
  );
}

export default Content;
