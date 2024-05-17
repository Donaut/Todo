import App, { TodoSchema } from "./api/App";
import KeycloakConnect from "keycloak-connect";
import ViteExpress from "vite-express";
import express from 'express';
import { MongoClient } from "mongodb";

//const realm = 'todo';
//const clientid = 'todo-spa';
//const keycloakurl = 'http://localhost:8080';

//process.env.VITE_KEYCLOAK_URL = keycloakurl;
//process.env.VITE_REALM = realm;
//process.env.VITE_CLIENTID = clientid;

console.log(process.env.VITE_REALM)

var keycloak = new KeycloakConnect({  }, {
    "realm": process.env.VITE_REALM as string,
    "auth-server-url": process.env.VITE_KEYCLOAK_URL as string,
    "ssl-required": "external",
    "resource": process.env.VITE_CLIENTID as string,

    /** @ts-ignore Property is missing from the interface. */
    "public-client": true,
    "confidential-port": 0,
  });

//OpenAPI.BASE = "http://localhost:3000/api/";
//OpenAPI.WITH_CREDENTIALS = true;

const expressServer = express();

console.log()

//mongodb://admin:admin@localhost:27017/
const client = new MongoClient('mongodb://admin:admin@localhost:27017/');

await client.connect();


const db = client.db('tododb');

const collection = await db.createCollection<TodoSchema>('todos', { })

const app = App({ collection: collection, keycloak: keycloak });

expressServer.use('/api', app);

ViteExpress.listen(expressServer, 3000, () => console.log("Server is listening on http://localhost:3000"));