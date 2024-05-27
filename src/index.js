const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { init, parseW3G } = require('./helper/parser');

const app = express();
const port = 3000;

// Initialize item data on server start
init();

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/parse-w3g', upload.single('file'), async (req, res) => {
    console.log('POST /parse-w3g');

    const username = req.body.username.toLowerCase() || "";

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const filePath = req.file.path;
        let result = await parseW3G(filePath, username);

        res.send(result);
    } catch (error) {
        res.status(500).send(error.message);
    } finally {
        fs.unlinkSync(req.file.path); // Clean up the uploaded file
    }
});

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname)));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});