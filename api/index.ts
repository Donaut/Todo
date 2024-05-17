import z from "zod";
import App, { TodoSchema } from "./app.js";
import { MongoClient } from "mongodb";
import KeycloakConnect from "keycloak-connect";

const envSchema = z.object({
    MONGO_URL: z.string(),
    MONGO_DB: z.string(),
    MONGO_COLLECTION: z.string(),
    KEYCLOAK_URL: z.string(),
    KEYCLOAK_REALM: z.string(),
    KEYCLOAK_CLIENTID: z.string()
})

const { MONGO_URL, MONGO_DB, MONGO_COLLECTION, KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENTID, } = envSchema.parse({
    MONGO_URL: process.env.MONGO_URL,
    MONGO_DB: process.env.MONGO_DB,
    MONGO_COLLECTION: process.env.MONGO_COLLECTION,
    KEYCLOAK_URL: process.env.KEYCLOAK_URL,
    KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
    KEYCLOAK_CLIENTID: process.env.KEYCLOAK_CLIENTID
})


const keycloak = new KeycloakConnect({}, {
    "realm": KEYCLOAK_REALM,
    "auth-server-url": KEYCLOAK_URL,
    "ssl-required": "external",
    "resource": KEYCLOAK_CLIENTID,

    /** @ts-ignore Property is missing from the interface. */
    "public-client": true,
    "confidential-port": 0,
  })

const client = new MongoClient(MONGO_URL);
await client.connect();
const db = client.db(MONGO_DB);
const collection = db.collection<TodoSchema>(MONGO_COLLECTION);

const app = App({ collection, keycloak });

app.listen(3000, () => console.log("Server is listening on http://localhost:3000"));
