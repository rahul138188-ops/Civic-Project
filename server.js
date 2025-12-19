const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // serve index.html

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Rahul@123", // replace with your MySQL password
  database: "civic"
});

db.connect(err => {
  if (err) throw err;
  console.log("Connected to MySQL database!");
});

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get address from OpenStreetMap
async function getAddress(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "ComplaintApp" }
    });
    return response.data.display_name;
  } catch (err) {
    console.error(err);
    return "Address not found";
  }
}

// POST complaint
app.post("/complaint", upload.single("photo"), async (req, res) => {
  try {
    const { name, category, latitude, longitude } = req.body;
    if (!req.file) return res.status(400).send("Photo is required");

    const photo = req.file.buffer;
    const address = await getAddress(latitude, longitude);

    const sql = `
      INSERT INTO users (name, category, latitude, longitude, photo, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [name, category, latitude, longitude, photo, address], (err) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).send("Database error");
      }
      res.send("Complaint submitted successfully!");
    });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).send("Server error");
  }
});

// GET all complaints in HTML
app.get("/complaints", (req, res) => {
  const sql = "SELECT * FROM users ORDER BY uploaded_at DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("Database error");

    let html = `
      <html>
      <head>
        <title>All Complaints</title>
        <style>
          table { border-collapse: collapse; width: 90%; margin: 20px auto; }
          th, td { border: 1px solid #333; padding: 10px; text-align: center; }
          th { background-color: #f2f2f2; }
          img { max-width: 150px; max-height: 150px; }
        </style>
      </head>
      <body>
        <h2 style="text-align:center;">All Complaints</h2>
        <table>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Category</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Address</th>
            <th>Photo</th>
            <th>Uploaded At</th>
          </tr>
    `;

    results.forEach(item => {
      const photoBase64 = item.photo.toString("base64");
      html += `
        <tr>
          <td>${item.complaint_id}</td>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>${item.latitude}</td>
          <td>${item.longitude}</td>
          <td>${item.address}</td>
          <td><img src="data:image/jpeg;base64,${photoBase64}" /></td>
          <td>${item.uploaded_at}</td>
        </tr>
      `;
    });

    html += `
        </table>
      </body>
      </html>
    `;
    res.send(html);
  });
});

// --- Server Start ---
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
