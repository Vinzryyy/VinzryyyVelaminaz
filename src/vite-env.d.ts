/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GH_TOKEN: string;
  readonly VITE_GH_REPO: string;
  readonly VITE_GH_BRANCH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
