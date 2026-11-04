export const environment = {
  production: true,
  apiBaseUrl: '/api/backend',
  apiKey: '', // Upstream gateway/reverse proxy injects internal authorization headers in production
  maxBatchSize: 50,
};
