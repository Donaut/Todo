/// <reference path="./client/d.ts" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

var envs = process.env as ImportMetaEnv;
console.log(envs.VITE_KEYCLOAK_URL);
//if(!envs.VITE_KEYCLOAK_URL) throw new Error('Environment variable VITE_KEYCLOAK_URL is not set. Its a string absolute url like: http://localhost:8080/ pointing to a running keycloak instance')
//if(!envs.VITE_REALM) throw new Error('Environment variable VITE_REALM is not set. Its used for keycloak to identify the realm to use.')
//if(!envs.VITE_CLIENTID) throw new Error('Environment variable VITE_CLIENTID is not set. Its used for keycloak to identify the client to use.')

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
    }
  },
  plugins: [react()],
});
