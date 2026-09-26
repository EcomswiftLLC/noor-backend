export const env = {
  port: Number(process.env.PORT ?? 8080),
  appEnv: process.env.APP_ENV ?? "development",

  // Quran Foundation Content API credentials. Per QF's own developer terms,
  // these must live on a server, never inside a distributed app - this is
  // the entire reason this backend exists. Absent in dev is fine; every
  // route that needs them degrades gracefully instead of crashing the process.
  qfClientId: process.env.QF_CLIENT_ID ?? null,
  qfClientSecret: process.env.QF_CLIENT_SECRET ?? null,
  qfTokenUrl: process.env.QF_TOKEN_URL ?? "https://oauth2.quran.foundation/oauth2/token",
  qfContentBaseUrl: process.env.QF_CONTENT_BASE_URL ?? "https://apis.quran.foundation/content/api/v4",

  minSupportedAppVersion: process.env.MIN_SUPPORTED_APP_VERSION ?? "1.0.0",

  // Comma-separated list of allowed CORS origins; the app itself doesn't run
  // in a browser, this only matters if a web admin tool is added later.
  corsOrigins: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean),
}

export const isQfConfigured = (): boolean => Boolean(env.qfClientId && env.qfClientSecret)
