import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // serve frontend

const COLLECTION = "cricket-live-score";

// 🏏 Get match details
app.get("/api/match/:id", async (req, res) => {
  const matchId = req.params.id;
  try {
    const docRef = db.collection(COLLECTION).doc(matchId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: "Match not found" });
    }
    res.json(snapshot.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🏏 Create or update a match
app.post("/api/match/:id", async (req, res) => {
  const matchId = req.params.id;
  const data = req.body;
  try {
    await db.collection(COLLECTION).doc(matchId).set(data, { merge: true });
    res.json({ message: "Match updated", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🧾 Get list of all matches
app.get("/api/matches", async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
