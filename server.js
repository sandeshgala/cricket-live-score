import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// 🔥 Firebase Admin initialization
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const COLLECTION = "cricket-live-score";

// ⚙️ Express + Socket.IO setup
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 🧾 Fetch all matches
app.get("/api/matches", async (req, res) => {
  const snapshot = await db.collection(COLLECTION).get();
  const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(matches);
});

// 🏏 Get a single match
app.get("/api/match/:id", async (req, res) => {
  const { id } = req.params;
  const docSnap = await db.collection(COLLECTION).doc(id).get();
  if (!docSnap.exists) return res.status(404).json({ error: "Match not found" });
  res.json(docSnap.data());
});

// 💾 Save or update match score
app.post("/api/match/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  await db.collection(COLLECTION).doc(id).set(data, { merge: true });
  io.emit("scoreUpdate", { id, ...data }); // broadcast to all clients
  res.json({ message: "Match updated", data });
});

// ⚡ Socket.IO realtime connections
io.on("connection", (socket) => {
  console.log("🟢 New client connected");

  // Client can subscribe to a specific match
  socket.on("subscribe", async (matchId) => {
    console.log(`Client subscribed to: ${matchId}`);

    const matchRef = db.collection(COLLECTION).doc(matchId);
    const snapshot = await matchRef.get();
    if (snapshot.exists) socket.emit("scoreUpdate", { id: matchId, ...snapshot.data() });

    // Firestore realtime listener
    const unsubscribe = matchRef.onSnapshot((docSnap) => {
      if (docSnap.exists) socket.emit("scoreUpdate", { id: matchId, ...docSnap.data() });
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected");
      unsubscribe();
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
