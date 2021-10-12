import express from "express";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";
import path from "path";

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, "/build")));
app.use(bodyParser.json());

const withDB = async (operations, res) => {
    try {
        const client = await MongoClient.connect("mongodb://localhost:27017");
        const db = client.db("my-blog");
        await operations(db);
        await client.close();
    } catch (error) {
        res.status(500).json({message: "Error connecting to DB", error});
    }
}

app.get("/api/articles/:name", async (req, res) => {
    await withDB(async (db) => {
        const articleName = req.params.name;
        const articleInfo = await db.collection("articles").findOne({ name: articleName });
        res.status(200).json(articleInfo);
    }, res);

});

// Upvote functionality
app.post("/api/articles/:name/upvote", async (req, res) => {
    await withDB(async (db) => {
        const articleName = req.params.name;

        const articleInfo = await db.collection("articles").findOne({ name: articleName });
        await db.collection("articles").updateOne({ name: articleName }, {
            "$set": {
                upvotes: articleInfo.upvotes + 1
            }
        });
        const updatedArticleInfo = await db.collection("articles").findOne({ name: articleName });
        res.status(200).json(updatedArticleInfo);
    }, res);

});

// Handle comments
app.post("/api/articles/:name/add-comment", async (req, res) => {
    const { username, text } = req.body;
    const articleName = req.params.name;

    await withDB(async (db) => {
        const articleInfo = await db.collection("articles").findOne({ name: articleName });
        await db.collection("articles").updateOne({ name: articleName }, {
            "$set": {
                comments: articleInfo.comments.concat({ username, text })
            }
        });
        const updatedArticleInfo = await db.collection("articles").findOne({ name: articleName });
        res.status(200).json(updatedArticleInfo);
    }, res);
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "/build/index.html"));
})

app.listen(8000, () => console.log("Listening on port 8000..."));