interface ImportMetaEnv {
  /** ICS feed of the church calendar. */
  readonly PUBLIC_AGENDA_ICS_URL?: string;
  /** Where the browser fetches the feed; in production /api/agenda (Azure Function). */
  readonly PUBLIC_AGENDA_PROXY_URL?: string;
  /** Subscribe link (webcal://...) for the visitor's own calendar app. */
  readonly PUBLIC_AGENDA_WEBCAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
