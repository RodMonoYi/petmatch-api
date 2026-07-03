export const getCorsOrigin = (): string | string[] => {
  const configuredOrigin = process.env.CORS_ORIGIN;

  if (!configuredOrigin || configuredOrigin.trim() === '*') {
    return '*';
  }

  const origins = configuredOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0] : origins;
};

export const shouldEnableCorsCredentials = (): boolean =>
  getCorsOrigin() !== '*';
