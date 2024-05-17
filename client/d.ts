/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_KEYCLOAK_URL: string,
    readonly VITE_REALM: string
    readonly VITE_CLIENTID: string;
    readonly VITE_API_URL: string;
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv
}