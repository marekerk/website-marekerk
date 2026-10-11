interface ImportMetaEnv {
  /** ICS-feed van de kerkelijke agenda. */
  readonly PUBLIC_AGENDA_ICS_URL?: string;
  /** CORS-proxy waarlangs de feed wordt opgehaald (Cloudflare Worker). */
  readonly PUBLIC_AGENDA_PROXY_URL?: string;
  /** Abonneerlink (webcal://...) voor de eigen agenda-app. */
  readonly PUBLIC_AGENDA_WEBCAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
