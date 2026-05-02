import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware para leer JSON
app.use(express.json());

// TEST SIMPLE (verifica que el server está vivo)
app.get("/", (req, res) => {
  res.send("API RUNNING");
});

// ENDPOINT PRINCIPAL VIBE
app.post("/vibe", (req, res) => {
  console.log("VIBE RECIBIDO:", req.body);

  if (!req.body || !req.body.vibe) {
    return res.status(400).json({
      error: "vibe_missing"
    });
  }

  res.json({
    status: "ok",
    received: req.body.vibe
  });
});

// ARRANQUE DEL SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});


