import { AppState, NormalizedZoomValue, PointerCoords, Zoom } from "../types";
import { ExcalidrawElement } from "../element/types";
import { getCommonBounds, getVisibleElements } from "../element";

import { ZOOM_STEP } from "../constants";
import { getNormalizedZoom } from "./zoom";

const sceneCoordsToViewportCoords = (
  { sceneX, sceneY }: { sceneX: number; sceneY: number },
  zoom: NormalizedZoomValue,
  {
    offsetLeft,
    offsetTop,
    scrollX,
    scrollY,
  }: {
    offsetLeft: number;
    offsetTop: number;
    scrollX: number;
    scrollY: number;
  },
) => {
  const x = (sceneX + scrollX) * zoom + offsetLeft;
  const y = (sceneY + scrollY) * zoom + offsetTop;
  return { x, y };
};

const isOutsideViewPort = (
  appState: AppState,
  zoom: NormalizedZoomValue,
  canvas: HTMLCanvasElement | null,
  cords: Array<number>,
  buffer: number = 0,
) => {
  const [x1, y1, x2, y2] = cords;
  const { x: viewportX1, y: viewportY1 } = sceneCoordsToViewportCoords(
    { sceneX: x1, sceneY: y1 },
    zoom,
    appState,
  );
  const { x: viewportX2, y: viewportY2 } = sceneCoordsToViewportCoords(
    { sceneX: x2, sceneY: y2 },
    zoom,
    appState,
  );
  return (
    viewportX2 - viewportX1 + buffer > appState.width // ||
    // viewportY2 - viewportY1 > appState.height
  );
};

export const centerScrollOn = ({
  scenePoint,
  viewportDimensions,
  zoom,
}: {
  scenePoint: PointerCoords;
  viewportDimensions: { height: number; width: number };
  zoom: Zoom;
}) => {
  return {
    scrollX: (viewportDimensions.width / 2) * (1 / zoom.value) - scenePoint.x,
    scrollY: (viewportDimensions.height / 2) * (1 / zoom.value) - scenePoint.y,
    zoom,
  };
};

export const calculateScrollCenter = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  canvas: HTMLCanvasElement | null,
  mode: string = "full",
): { scrollX: number; scrollY: number } => {
  elements = getVisibleElements(elements);

  if (!elements.length) {
    return {
      scrollX: 0,
      scrollY: 0,
    };
  }
  let [x1, y1, x2, y2] = getCommonBounds(elements);

  let zoom = appState.zoom;
  const buffer = 40;
  // zoom out if the width of all elements is too wide, but otherwise center against all elements
  while (
    isOutsideViewPort(appState, zoom.value, canvas, [x1, y1, x2, y2], buffer) &&
    zoom.value > 0.2
  ) {
    zoom = {
      value: getNormalizedZoom(zoom.value - ZOOM_STEP),
    };
  }

  const centerX = (x1 + x2) / 2;
  let centerY = (y1 + y2) / 2;

  if (mode !== "none") {
    centerY -= 20;
  } else {
    centerY += 10;
  }

  return centerScrollOn({
    scenePoint: { x: centerX, y: centerY },
    viewportDimensions: { width: appState.width, height: appState.height },
    zoom,
  });
};
