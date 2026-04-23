const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // For saving JSON data
app.use(express.static(__dirname)); // Serve the whole gallery directory for images and CSS

// Ensure images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Setup Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename or generate a safe one
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    // Ensure uniqueness if needed, but original name is usually preferred by users
    cb(null, safeName);
  }
});
const upload = multer({ storage: storage });

// Routes

// 1. Get Gallery JSON
app.get('/api/data', (req, res) => {
  const jsonPath = path.join(__dirname, 'gallery.json');
  if (fs.existsSync(jsonPath)) {
    const data = fs.readFileSync(jsonPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(data);
  } else {
    res.status(404).json({ error: 'gallery.json not found' });
  }
});

// 2. Save Gallery JSON
app.post('/api/data', (req, res) => {
  const jsonPath = path.join(__dirname, 'gallery.json');
  try {
    const formattedData = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(jsonPath, formattedData, 'utf8');
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving JSON:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// 3. Upload Image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return the path that the frontend should use in the JSON
  const srcPath = `images/${req.file.filename}`;
  res.json({ success: true, src: srcPath });
});

// Serve the admin panel HTML explicitly
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================`);
  console.log(`✨ K7th CMS Admin Panel is running! ✨`);
  console.log(`👉 Open: http://localhost:${PORT}/admin`);
  console.log(`======================================\n`);
});
