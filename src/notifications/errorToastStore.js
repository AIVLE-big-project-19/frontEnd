let listener = null;

export const showErrorToast = (message) => {
  if (listener) {
    listener(message);
  }
};

export const subscribeToErrorToast = (callback) => {
  listener = callback;
  return () => {
    if (listener === callback) {
      listener = null;
    }
  };
};
