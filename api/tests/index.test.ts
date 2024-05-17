import assert from 'assert/strict';
import test, { after, before, describe, it } from "node:test";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { MongoClient } from 'mongodb';
import request from "supertest";
import App, { TodoSchema } from '../app.js';
import KeycloakConnect from 'keycloak-connect';
import { Express } from "express";


describe('todo api integration tests', async () => {

    let mongodbContainer: StartedTestContainer;
    let mongoClient: MongoClient;

    let access_token: string;

    let createApp: () => Promise<Express>;

    before(async () => {
        const p1 = new GenericContainer('mongo')
            .withExposedPorts(27017)
            .start();
        
        const p2 = new GenericContainer('keycloak/keycloak:24.0.4')
            .withCommand(["start-dev", "--import-realm", "--override=false"])
            .withEnvironment({
                KEYCLOAK_ADMIN: 'admin',
                KEYCLOAK_ADMIN_PASSWORD: 'admin'
            })
            .withCopyDirectoriesToContainer([{
                source: './kc/import/',
                target: '/opt/keycloak/data/import/',
            }])
            .withExposedPorts(8080)
            .withReuse()
            .start();

        const [ c1, c2 ] = await Promise.all([p1, p2]);
        mongodbContainer = c1;

        const dbport = c1.getMappedPort(27017);
        mongoClient = new MongoClient(`mongodb://localhost:${dbport}/`);

        await mongoClient.connect();
        
        const db = mongoClient.db('tododb');
        

        const kcrealm = 'todo';
        const kcclient = 'todo-spa';
        const kcport = c2.getMappedPort(8080);
        const keycloak = new KeycloakConnect({ }, {
            "realm": kcrealm,
            "auth-server-url": `http://localhost:${kcport}/`,
            "ssl-required": "external",
            "resource": kcclient,
        
            /** @ts-ignore Property is missing from the interface. */
            "public-client": true,
            "confidential-port": 0,
        })

        let counter = 0;
        createApp = async () => {

            const collection = await db.createCollection<TodoSchema>(`todos${counter++}`, { })

            return App({ collection, keycloak});
        }

        const response = await fetch(`http://localhost:${kcport}/realms/${kcrealm}/protocol/openid-connect/token`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                'username': 'test@gmail.com',
                'password': 'test',
                'grant_type': 'password',
                'client_id': kcclient
            })
        })

        if(!response.ok)
            throw new Error("Fetch error");
            

        const tokens = await response.json() as { access_token:string, expires_in: number, refresh_expires_in: 1800, refresh_token: string, token_type: string, session_state: string, scope: string  };
        access_token = tokens.access_token;
    })

    after(async () => {
        await mongodbContainer.stop();

        process.exit(0); // BUG: Testcontainers prevents the process from closing.
    })

    it('Authenticated user get /todo returns 200', async () => {
        const app = await createApp();
        const result = await request(app)
            .get('/todo')
            .auth(access_token, { type: 'bearer' })
            .expect('Content-Type', /json/)
            .expect(200)

        assert(Array.isArray(result.body))
    }),

    it('get /todo skipping optional fields still returns 201', async () => {
        const app = await createApp();

        await request(app)
            .post('/todo')
            .auth(access_token, { type: 'bearer' })
            .send({ content: 'Content1' })
            .expect(201);

        await request(app)
            .post('/todo')
            .auth(access_token, { type: 'bearer' })
            .send({ content: 'Content2' })
            .expect(201);
        
        await request(app)
            .post('/todo')
            .auth(access_token, { type: 'bearer' })
            .send({ content: 'Content3' })
            .expect(201);

        await request(app)
            .post('/todo')
            .auth(access_token, { type: 'bearer' })
            .send({ content: 'Content4' })
            .expect(201);

        // The get /todo endpoint orders the todos by creation time by default so the first item is going to be the last we added to it.
        await request(app)
            .get('/todo?skip=1')
            .auth(access_token, { type: 'bearer' })
            .expect('Content-Type', /json/)
            .expect(200)
            .then(res => assert.strictEqual(res.body[0].content, 'Content3'))
    })

    it('Non authenticated user get /todo returns 403', async () => {
        const app = await createApp();
        await request(app)
            .get('/todo')
            .expect(403);
    }),

    it('Post /todo missing required fields results in a 400', async () => {
        const app = await createApp();

        await request(app)
            .post('/todo')
            .auth(access_token, { type: 'bearer' })
            .expect(400)
    }),

    it('Post /todo only required fields set results in a 201', async () => {
        const app = await createApp();

        await request(app)
            .post('/todo')
            .send({ content: 'Hello World!' })
            .auth(access_token, { type: 'bearer' })
            .expect(201)
            /** @ts-ignore */
            .then(res => {
                assert(Object.hasOwn(res.body, 'id'))
            })
    })

    it('Put /todo updating todo returns 200', async () => {
        const app = await createApp();

        const response = await request(app)
            .post('/todo')
            .send({ content: 'Hello World' })
            .auth(access_token, { type: 'bearer' })
            .expect(201)

        const id = response.body.id;
        console.log('geraffsasffas')
        console.log(id);
        const res2 = await request(app)
            .put('/todo')
            .send({ id: id, content: 'New content', checked: true})
            .set('Content-Type',  'application/json')
            .auth(access_token, { type: 'bearer' })
            .expect(200);
        
       
        const res1 = await request(app)
            .get('/todo')
            .auth(access_token, { type: 'bearer' })
            .expect(200);

        console.log('HERE')
        console.log(res1.body);

        assert.strictEqual(res1.body[0].content, 'New content');
    })
})