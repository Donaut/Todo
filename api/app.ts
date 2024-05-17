import express from "express";
import { Keycloak } from "keycloak-connect";
import { Collection, ObjectId } from "mongodb";
import { z } from "zod";

export interface TodoSchema extends Document {
  userID: string;
  content: string;
  checked: boolean;
  createdAt: Date;
}

export default function App({ collection, keycloak }: { collection: Collection<TodoSchema>; keycloak: Keycloak }) {
  keycloak.redirectToLogin = () => false;

  const app = express();

  const todoPostSchema = z.object({
    userID: z.string(),
    content: z.string().min(1),
    checked: z.boolean().optional().default(() => false),
    createdAt: z.date().optional().default(() => new Date()),
  });

  const todoPutSchema = z.object({
    userID: z.string(),
    id: z.string(),
    content: z.string().min(1).optional(),
    checked: z.boolean().optional(),
  })

  const todoDeleteSchema = z.object({
    userID: z.string(),
    todoID: z.string(),
  });

  app.use(express.json());
  app.use(keycloak.middleware());

  app.get("/todo", keycloak.protect("read"), async (req, res, next) => {
    /* @ts-ignore **/
    const skip = Math.max(0, +req.query.skip || 0);
    const limit = 50;
    /* @ts-ignore **/
    const userID = req.kauth.grant.access_token.content.sub;

    const promise = collection
      .find({ userID: userID }, { projection: { _id: 0, id: "$_id", content: 1, checked: 1 } })
      .skip(skip * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    promise.then((todos) => res.status(200).json(todos)).catch(next);
  });

  app.post("/todo", keycloak.protect("read"), keycloak.protect("write"), async (req, res, next) => {
    try {
      const parseResult = await todoPostSchema.safeParseAsync({
        /** @ts-ignore */
        userID: req.kauth.grant.access_token.content.sub,
        content: req.body.content,
        checked: req.body.checked,
        createdAt: req.body.createdAt,
      });

      if (!parseResult.success) return res.status(400).json(parseResult.error);

      const { userID, content, checked, createdAt } = parseResult.data;

      const result = await collection.insertOne({ userID, content, checked, createdAt });

      if (!result.acknowledged) return next(new Error("Insert was not acknowledged"));

      // TODO: Add location header
      return res.status(201).json({ id: result.insertedId });
    } catch (error) {
      next(error);
    }
  });

  app.put("/todo", keycloak.protect("read"), keycloak.protect("write"), async (req, res, next) => {

    const parseResult = await todoPutSchema.safeParseAsync({
      /** @ts-ignore */
      userID: req.kauth.grant.access_token.content.sub,
      id: req.body.id,
      content: req.body.content,
      checked: req.body.checked,
    });

    if (!parseResult.success) return res.status(400).json(parseResult.error);

    const { userID, id, content, checked } = parseResult.data;

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { content, checked } });

    if (!result.acknowledged) return next(new Error("Update result not acknowledged!"));

    // No todo was found.
    if (result.matchedCount == 0) return res.sendStatus(404);

    if (result.matchedCount == 1 && result.modifiedCount == 1) return res.sendStatus(200);
    else return next(new Error("Update modified the database or multiple match was found."));
  });

  app.delete("/todo/:todoid", keycloak.protect("read"), keycloak.protect("write"), async (req, res, next) => {
    //const todoID = ;
    try {
      
      /** @ts-ignore */
      const parseResult = await todoDeleteSchema.safeParseAsync({ userID: req.kauth.grant.access_token.content.sub, todoID: req.params.todoid, });

      if(!parseResult.success) return res.status(400).json(parseResult.error);
      
      const { userID, todoID } = parseResult.data;

      const result = await collection.deleteOne({ userID: userID, _id: new ObjectId(todoID) });

      if (!result.acknowledged) {
        next(new Error("Result not acknowledged!"));
        return;
      }

      if (result.deletedCount == 0) return res.sendStatus(404);

      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });

  return app;
}
