const express = require('express');
const multer = require('multer');
const { Readable } = require('stream');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const app = express();
const port = process.env.PORT || 4000;
require('dotenv').config();
const dbURI = process.env.MONGODB_URI;
// Set view engine to EJS

app.set('view engine', 'ejs');

// Connect to MongoDB Atlas
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
const conn = mongoose.connection;

// Initialize GridFSBucket
let gfs;
conn.once('open', () => {
    gfs = new GridFSBucket(conn.db, { bucketName: 'uploads' });
});

// Create storage engine for multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Route for file upload form (GET request)
app.get('/', (req, res) => {
    res.render('upload');
});

// Route for file upload (POST request)
app.post('/upload', upload.single('file'), (req, res) => {
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    const writestream = gfs.openUploadStream(req.file.originalname);
    readableStream.pipe(writestream);

    writestream.on('finish', () => {
        res.redirect('/files');
    });
});

// Route to get list of uploaded files
app.get('/files', (req, res) => {
    gfs.find().toArray((err, files) => {
        if (err) {
            return res.status(500).json({ error: err });
        }
        if (!files || files.length === 0) {
            return res.status(404).json({
                message: 'No files found'
            });
        }
        // Files found, render the files view with the files array
        return res.render('files', { files });
    });
});

// Route to download a file
app.get('/download/:filename', (req, res) => {
    gfs.openDownloadStreamByName(req.params.filename).pipe(res);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
