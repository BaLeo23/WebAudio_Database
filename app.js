const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'web_audio_db'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Account Routes
app.get('/accounts', (req, res) => {
    db.query('SELECT * FROM Account', (err, results) => {
        if (err) {
            console.error('Error fetching accounts:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.post('/accounts', (req, res) => {
    const { username, password, email, soundfile_id, usecase_id } = req.body;
    db.query('INSERT INTO Account SET ?', { username, password, email, soundfile_id, usecase_id }, (err, results) => {
        if (err) {
            console.error('Error creating account:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('Account created successfully.');
    });
});

// Soundfile Routes
app.get('/soundfiles', (req, res) => {
    db.query('SELECT * FROM Soundfile', (err, results) => {
        if (err) {
            console.error('Error fetching soundfiles:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.post('/soundfiles', (req, res) => {
    const { id, filename, filepath, upload_date } = req.body;
    db.query('INSERT INTO Soundfile SET ?', { id, filename, filepath, upload_date }, (err, results) => {
        if (err) {
            console.error('Error creating soundfile:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('Soundfile created successfully.');
    });
});

// Progress Routes
app.get('/progress', (req, res) => {
    db.query('SELECT * FROM Progress', (err, results) => {
        if (err) {
            console.error('Error fetching progress:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.post('/progress', (req, res) => {
    const { id, account_username, poi_id, found } = req.body;
    db.query('INSERT INTO Progress SET ?', { id, account_username, poi_id, found }, (err, results) => {
        if (err) {
            console.error('Error creating progress:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('Progress created successfully.');
    });
});

// Usecase Routes
app.get('/usecases', (req, res) => {
    db.query('SELECT * FROM Usecase', (err, results) => {
        if (err) {
            console.error('Error fetching usecases:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.post('/usecases', (req, res) => {
    const { id, titel, beschreibung, fixed_order, qr_code, poi_id } = req.body;
    db.query('INSERT INTO Usecase SET ?', { id, titel, beschreibung, fixed_order, qr_code, poi_id }, (err, results) => {
        if (err) {
            console.error('Error creating usecase:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('Usecase created successfully.');
    });
});

// POI Routes
app.get('/pois', (req, res) => {
    db.query('SELECT * FROM POI', (err, results) => {
        if (err) {
            console.error('Error fetching POIs:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.post('/pois', (req, res) => {
    const { id, order, x_coordinate, y_coordinate, filepath, soundfile_id } = req.body;
    db.query('INSERT INTO POI SET ?', { id, order, x_coordinate, y_coordinate, filepath, soundfile_id }, (err, results) => {
        if (err) {
            console.error('Error creating POI:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('POI created successfully.');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
