/**
 * Development environment configuration.
 *
 * `apiBaseUrl` is intentionally empty so the app issues relative requests
 * (e.g. `/TODOList`). During `ng serve` these are forwarded to the backend by
 * `proxy.conf.json`, which avoids browser CORS and local HTTPS dev-cert issues.
 */
export const environment = {
  production: false,
  apiBaseUrl: '',
};
