/**
 * Live build: talks to the Spring Boot loan-assessment-api.
 * `ng serve --configuration live` proxies /api to http://localhost:8080 (see proxy.conf.json).
 */
export const environment = {
  demo: false,
  apiUrl: '',
  demoLatencyMs: 0,
};
