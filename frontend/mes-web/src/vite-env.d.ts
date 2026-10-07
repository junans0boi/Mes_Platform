/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_HUB_URL?: string;
  readonly VITE_MUIX_LICENSE_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
