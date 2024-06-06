const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
//const cors = require('cors');

const app = express();
const port = 3000;

// MySQL-Verbindung einrichten
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'web_audio_db'
});

db.connect((err) => {
    if (err) {
        console.error('Fehler beim Verbinden zur Datenbank:', err);
        return;
    }
    console.log('Mit der MySQL-Datenbank verbunden.');
});

// Middleware
//app.use(bodyParser.json());
//app.use(cors()); // Ermöglicht CORS-Anfragen von anderen Domänen

// Account-Routen
app.get('/accounts', (req, res) => {
    const sql = 'SELECT * FROM Account';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Serverfehler beim Abrufen der Daten');
        res.json(results);
    });
});

app.post('/accounts', (req, res) => {
    const { username, password, email, soundfile_id, usecase_id } = req.body;
    const sql = 'INSERT INTO Account (username, password, email, soundfile_id, usecase_id) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [username, password, email, soundfile_id, usecase_id], (err, result) => {
        if (err) return res.status(500).send('Serverfehler beim Einfügen der Daten');
        res.send('Account hinzugefügt!');
    });
});

// Soundfile-Routen
app.get('/soundfiles', (req, res) => {
    const sql = 'SELECT * FROM Soundfile';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Serverfehler beim Abrufen der Daten');
        res.json(results);
    });
});

app.post('/soundfiles', (req, res) => {
    const { filename, filepath } = req.body;
    const sql = 'INSERT INTO Soundfile (filename, filepath) VALUES (?, ?)';
    db.query(sql, [filename, filepath], (err, result) => {
        if (err) return res.status(500).send('Serverfehler beim Einfügen der Daten');
        res.send('Soundfile hinzugefügt!');
    });
});

// Progress-Routen
app.get('/progress', (req, res) => {
    const sql = 'SELECT * FROM Progress';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Serverfehler beim Abrufen der Daten');
        res.json(results);
    });
});

app.post('/progress', (req, res) => {
    const { account_username, poi_id, found } = req.body;
    const sql = 'INSERT INTO Progress (account_username, poi_id, found) VALUES (?, ?, ?)';
    db.query(sql, [account_username, poi_id, found], (err, result) => {
        if (err) return res.status(500).send('Serverfehler beim Einfügen der Daten');
        res.send('Progress hinzugefügt!');
    });
});

// Usecase-Routen
app.get('/usecases', (req, res) => {
    const sql = 'SELECT * FROM Usecase';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Serverfehler beim Abrufen der Daten');
        res.json(results);
    });
});

app.post('/usecases', (req, res) => {
    const { titel, beschreibung, fixed_order, qr_code, poi_id } = req.body;
    const sql = 'INSERT INTO Usecase (titel, beschreibung, fixed_order, qr_code, poi_id) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [titel, beschreibung, fixed_order, qr_code, poi_id], (err, result) => {
        if (err) return res.status(500).send('Serverfehler beim Einfügen der Daten');
        res.send('Usecase hinzugefügt!');
    });
});

// POI-Routen
app.get('/pois', (req, res) => {
    const sql = 'SELECT * FROM POI';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send('Serverfehler beim Abrufen der Daten');
        res.json(results);
    });
});

app.post('/pois', (req, res) => {
    const { order, x_coordinate, y_coordinate, filepath, soundfile_id } = req.body;
    const sql = 'INSERT INTO POI (order, x_coordinate, y_coordinate, filepath, soundfile_id) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [order, x_coordinate, y_coordinate, filepath, soundfile_id], (err, result) => {
        if (err) return res.status(500).send('Serverfehler beim Einfügen der Daten');
        res.send('POI hinzugefügt!');
    });
});

// Server starten
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
