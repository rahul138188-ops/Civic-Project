
import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js"; // MongoDB connection
import authRoutes from "./routes/authRoutes.js";
import logger from "./middleware/logger.js";
import errorHandler from "./middleware/errorHandler.js";

import mysql from "mysql2/promise"; // MySQL client
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 Connect MongoDB
connectDB();

// 🔹 MySQL connection pool
const pool = mysql.createPool({
  host: "10.146.34.2",
  user: "public_user", // change if needed
  password: "Kartikey@123", // change if needed
  database: "civic",
  port: 3306
});

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(logger);

// 🔹 Auth routes
app.use("/api/auth", authRoutes);

// ==================== COMPLAINTS API ====================

// Get all complaints (with uploaded_at and photo_url)
// Get all complaints (with uploaded_at, photo_url, and lat/long)
// ==================== COMPLAINTS API ====================

// Get all complaints (with uploaded_at, photo_url, lat/long, Priority, and chat)
app.get("/api/complaints", async (req, res) => {
  try {
    // Include Priority and chat columns in SELECT
   const [rows] = await pool.query(
  "SELECT complaint_id, name, category, complaint_status, address, uploaded_at, latitude, longitude, Priority, chat FROM users"
);

    // Map photo URL
    const dataWithPhoto = rows.map((c) => ({
      ...c,
      photo_url: `/api/complaints/${c.complaint_id}/photo`,
    }));

    res.json(dataWithPhoto);
  } catch (err) {
    console.error("Error fetching complaints:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});



// Get photo by complaint ID (BLOB column)
app.get("/api/complaints/:id/photo", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT photo FROM users WHERE complaint_id=?",
      [id]
    );

    if (!rows.length || !rows[0].photo) {
      return res.status(404).send("No photo found");
    }

    // Adjust mime-type if your images are JPEG
    res.setHeader("Content-Type", "image/png");
    res.send(rows[0].photo);
  } catch (err) {
    console.error("Error fetching photo:", err);
    res.status(500).send("Error fetching photo");
  }
});


// Update complaint status
app.put("/api/complaints/:id", async (req, res) => {
  const { id } = req.params;
  const { complaint_status } = req.body;

  try {
    await pool.query(
      "UPDATE users SET complaint_status=? WHERE complaint_id=?",
      [complaint_status, id]
    );
    res.json({ message: "Complaint status updated" });
  } catch (err) {
    console.error("Error updating complaint:", err);
    res.status(500).json({ error: "Database update failed" });
  }
});

// =========================================================

// 🔹 Root test
app.get("/", (req, res) => res.send("API Running"));

// 🔹 Error handler
app.use(errorHandler);

// 🔹 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT,"0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
