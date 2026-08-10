const overlayStack = [];

export const registerOverlay = (id) => {
  const index = overlayStack.indexOf(id);
  if (index >= 0) overlayStack.splice(index, 1);
  overlayStack.push(id);
};

export const unregisterOverlay = (id) => {
  const index = overlayStack.indexOf(id);
  if (index >= 0) overlayStack.splice(index, 1);
};

export const consumeTopOverlay = (id) => {
  if (overlayStack[overlayStack.length - 1] !== id) return false;
  overlayStack.pop();
  return true;
};

export const getOverlayZIndex = (id) => 1000 + Math.max(0, overlayStack.indexOf(id));
