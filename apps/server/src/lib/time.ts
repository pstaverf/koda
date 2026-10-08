export const holdMinimumLatency = async (startedAt: number, minimumMs: number): Promise<void> => {
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => {
      setTimeout(resolve, remaining);
    });
  }
};
