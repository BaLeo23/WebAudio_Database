const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
// Multer
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//app.use(express.static('/home/webaudio/html/webAudioAdminInterface'));
//app.use(express.static('/home/webaudio/my-node-app/WebAudio_Database/public'));

//Route für die Wurzel-URL
//app.get('/', (req, res) => {
//res.sendFile('/home/webaudio/html/webAudioAdminInterface/index.html');
//res.sendFile('/home/webaudio/my-node-app/WebAudio_Database/public/index.html');
//});


app.use(cors({
    origin: '*',
    headers: 'Content-Type, Authorization',
    methods: 'GET, POST, PUT, DELETE',
    credentials: true
}));

app.use(session({
    secret: 'kIDhEhgpshfnr',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 60000 * 120} //session ist für 2 Stunden geöffnet
}));

// Multer Konfiguration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Stelle sicher, dass das Verzeichnis existiert, andernfalls erstelle es
        const dir = path.join(__dirname, 'uploads');
        console.log(dir)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname + " " + req.session.username);
    }
});
const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    //user: 'root',
    //password: '',
    //database: 'web_audio_db'
    //port: 3307,
    user: 'webaudio',
    password: 'aui19o.qka1buDyjz44y',
    database: 'webaudio'
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

app.get('/api/isAlreadyLoggedin', (req, res) => {

    if(req.session.username){
        console.log("already loggedIn")
        res.send("true");
    } else {
        res.send("false");
    }
});

app.post('/api/loginAdmin', async (req, res) => {
    const { username, password } = req.body;
    try {
        if(req.session.username && req.session.username === ""){
            console.log("already loggedIn")
            res.send(true);
        } else if(username == null){
            res.send(false)
        } else {
            db.query('SELECT * FROM Account WHERE username = ?', [username], async (err, results) => {
                if (err) {
                    console.error('Error fetching accounts:', err);
                    res.status(500).send('Internal Server Error');
                    return;
                }
                if (results.length === 0) {
                    return res.send("false");
                }

                const user = results[0];
                console.log('User found:', user)
                console.log(user.password)

                if (!user || !(await bcrypt.compare(password, user.password))) {
                    return res.send("false");
                }
                req.session.isLoggedIn = true;
                console.log(user.username)
                req.session.username = user.username;
                console.log(req.session);
                console.log(req.session.id);
                res.send("true");
            });
        }
    } catch (error) {
        console.error('Error processing login:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/logout', (req, res) => {

    req.session.username = ""
    req.session.isLoggedIn = false
    req.session.chosenUsecase = ""
    console.log(req.session)

    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }
    });
    res.clearCookie('connect.sid', { path: '/', httpOnly: true, secure: false });
    res.send(true)
    console.log(req.cookies)
    console.log(req.session)
});

// Account Routes
app.get('/api/accounts', (req, res) => {
    db.query('SELECT * FROM Account', (err, results) => {
        if (err) {
            console.error('Error fetching accounts:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.post('/api/accounts', async (req, res) => {
    const { username, password } = req.body;
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        db.query('INSERT INTO Account SET ?', {username, password: hashedPassword}, (err, results) => {
            if (err) {
                console.error('Error creating account:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            res.send('Account created successfully.');
        });
    }catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Route zum Aktualisieren eines Accounts
app.put('/api/accounts/:username', (req, res) => {
    const { username } = req.params;
    const { password } = req.body;
    const sql = 'UPDATE Account SET password = ? WHERE username = ?';
    db.query(sql, [password, username], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        res.send(`Account mit Username ${username} aktualisiert!`);
    });
});



// Route zum Löschen eines Accounts
app.delete('/api/accounts/:username', (req, res) => {
    const { username } = req.params;
    const sql = 'DELETE FROM Account WHERE username = ?';
    db.query(sql, [username], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return res.status(500).send('Serverfehler beim Löschen der Daten');
        }

        if (result.affectedRows === 0) {
            res.status(404).send('Account nicht gefunden');
            return;
        }

        res.send(`Account mit Username ${username} gelöscht!`);
    });
});

app.get('/api/soundfiles', (req, res) => {
    const account_username = req.session.username
    if(!account_username){
        return res.status(401).send('Unauthorized');
    }
    db.query('SELECT * FROM Soundfile WHERE account_username = "standart" || account_username = ?', [account_username], (err, results) => {
        if (err) {
            console.error('Error fetching soundfiles:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

// Route zum Bereitstellen der Sounddatei
app.get('/api/soundfiles/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'SELECT filepath FROM Soundfile WHERE id = ?';

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Fehler beim Abrufen der Daten:', err);
            return res.status(500).send('Serverfehler beim Abrufen der Daten');
        }

        if (results.length === 0) {
            return res.status(404).send('Soundfile nicht gefunden');
        }

        const filePath = results[0].filepath;

        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('Fehler beim Senden der Datei:', err);
                res.status(500).send('Fehler beim Senden der Datei');
            }
        });
    });
});

app.get('/api/soundfilesFile/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Fehler beim Senden der Datei:', err);
            res.status(500).send('Fehler beim Senden der Datei');
        }
    });
});

app.post('/api/soundfiles', upload.single('file'), (req, res) => {
    const account_username = req.session.username;
    if(!account_username){
        return response.status(401).send('Unauthorized');
    }
    if (!req.file) {
        return res.status(400).send('Keine Datei hochgeladen');
    }

    const filename = req.file.originalname + " " + req.session.username;  // Nutze den originalen Dateinamen
    const filepath = req.file.path;
    const upload_date = new Date();
    db.query('INSERT INTO Soundfile (filename, filepath, upload_date, account_username) VALUES (?, ?, ?, ?)',
        [filename, filepath, upload_date, account_username],
        (err, results) => {
            if (err) {
                console.error('Fehler beim Einfügen der Daten:', err);
                return res.status(500).send('Serverfehler');
            }
            res.send('Soundfile erfolgreich erstellt');
        });
});

// Route zum Aktualisieren eines Soundfiles
app.put('/api/soundfiles/:id', (req, res) => {
    const { id } = req.params;
    const { filename, account_username } = req.body;

    // Den aktuellen Dateipfad aus der Datenbank abrufen
    const getFilePathSql = 'SELECT filepath FROM Soundfile WHERE id = ?';
    db.query(getFilePathSql, [id], (err, results) => {
        if (err) {
            console.error('Fehler beim Abrufen des Dateipfads:', err);
            return res.status(500).send('Serverfehler beim Abrufen des Dateipfads');
        }

        if (results.length === 0) {
            return res.status(404).send('Soundfile nicht gefunden');
        }

        const oldFilePath = results[0].filepath;
        const newFilePath = path.join(path.dirname(oldFilePath), filename);

        // Die Datei im Dateisystem umbenennen
        fs.rename(oldFilePath, newFilePath, (err) => {
            if (err) {
                console.error('Fehler beim Umbenennen der Datei:', err);
                return res.status(500).send('Serverfehler beim Umbenennen der Datei');
            }

            // Den Dateinamen und den Dateipfad in der Datenbank aktualisieren
            const updateSql = 'UPDATE Soundfile SET filename = ?, filepath = ?, account_username = ? WHERE id = ?';
            db.query(updateSql, [filename, newFilePath, account_username, id], (err, result) => {
                if (err) {
                    console.error('Fehler beim Aktualisieren der Daten:', err);
                    return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
                }

                if (result.affectedRows === 0) {
                    return res.status(404).send('Soundfile nicht gefunden');
                }

                res.send(`Soundfile mit ID ${id} aktualisiert!`);
            });
        });
    });
});



// Route zum Löschen einer Soundfile
app.delete('/api/soundfiles/:id', (req, res) => {
    const { id } = req.params;

    // Den Dateipfad aus der Datenbank abrufen
    db.query('SELECT filepath FROM Soundfile WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Fehler beim Abrufen des Dateipfads:', err);
            return res.status(500).send('Serverfehler beim Abrufen des Dateipfads');
        }

        if (results.length === 0) {
            return res.status(404).send('Soundfile nicht gefunden');
        }

        const filepath = results[0].filepath;

        // Die Datei vom Dateisystem löschen
        fs.unlink(filepath, (err) => {
            if (err) {
                console.error('Fehler beim Löschen der Datei:', err);
                return res.status(500).send('Serverfehler beim Löschen der Datei');
            }

            // Den Eintrag in der Datenbank löschen
            db.query('DELETE FROM Soundfile WHERE id = ?', [id], (err, result) => {
                if (err) {
                    console.error('Fehler beim Löschen des Datenbankeintrags:', err);
                    return res.status(500).send('Serverfehler beim Löschen des Datenbankeintrags');
                }

                res.send('Soundfile erfolgreich gelöscht');
            });
        });
    });
});

// Usecase Routes

app.get('/api/usecasesAdmin', (req, res) => {
    console.log(req.session)
    console.log(req.session.id)
    console.log(req.session.username)
    if(!req.session.username) {
        return res.status(401).send('Unauthorized');
    }
    const username = req.session.username;
    console.log(username);
    db.query('SELECT * FROM Usecase WHERE account_username = ?', [username], (err, results) => {
        if (err) {
            console.error('Error fetching usecases:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.get('/api/usecases/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM Usecase WHERE id = ?', id, (err, results) => {
        if (err) {
            console.error(`Error fetching usecase with id ${id}:`, err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
})

app.post('/api/usecasesAdmin', (req, res) => {
    const { titel, beschreibung } = req.body;
    if(!req.session.username){
        return res.status(401).send('Unauthorized');
    }
    const account_username = req.session.username;
    db.query('INSERT INTO Usecase SET ?', { id: null, titel, beschreibung, fixed_order: '0', account_username }, (err, results) => {
        if (err) {
            console.error('Error creating usecase:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('Usecase created successfully.');
    });
});

// Route zum Aktualisieren eines Usecases
app.put('/api/usecases/:id', (req, res) => {
    const { id } = req.params;
    const { titel, beschreibung, fixed_order, account_username } = req.body;
    const sql = 'UPDATE Usecase SET titel = ?, beschreibung = ?, fixed_order = ?, account_username = ? WHERE id = ?';
    db.query(sql, [titel, beschreibung, fixed_order, account_username, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        res.send(`Usecase mit ID ${id} aktualisiert!`);
    });
});

app.put('/api/updateFixedOrderOfChosenUseCase', (req, res) => {
    const {fixed_order} = req.body
    if(!req.session.chosenUsecase){
        res.status(404).send('Usecase nicht gefunden');
    }
    const id = req.session.chosenUsecase.id
    const sql = 'UPDATE Usecase SET fixed_order = ? WHERE id = ?';
    db.query(sql, [ fixed_order, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        db.query('SELECT * FROM Usecase WHERE id = ?', [id], (err, results) => {
            if (err) {
                console.error('Error fetching usecases:', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            console.log(results[0]);
            req.session.chosenUsecase = results[0];
            res.send(`Usecase mit ID ${id} aktualisiert!`);
        });
    });
})


app.delete('/api/usecases/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM Usecase WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return res.status(500).send('Serverfehler beim Löschen der Daten');
        }

        if (result.affectedRows === 0) {
            res.status(404).send('Usecase nicht gefunden');
            return;
        }

        res.send(`Usecase mit ID ${id} gelöscht!`);
    });
});

app.post('/api/chosenUseCase', (req, res) => {
    const {id} = req.body
    if(!req.session.username) {
        return res.status(401).send('Unauthorized');
    }
    if(!id){
        return res.send('requeste id is null');
    }
    db.query('SELECT * FROM Usecase WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching usecases:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        console.log(results[0]);
        req.session.chosenUsecase = results[0];
        res.send(true);
    });
})

app.get('/api/chosenUseCase', (req, res) => {
    if(!req.session.username) {
        return res.status(401).send('Unauthorized');
    }
    if(!req.session.chosenUsecase){
        return res.status(404).send('Usecase nicht gesetzt');
    }

    console.log(req.session.chosenUsecase)
    res.json(req.session.chosenUsecase)
})

// POI Routes
app.get('/api/usecases/:id/pois', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM POI WHERE usecase_id = ?', id, (err, results) => {
        if (err) {
            console.error(`Error fetching usecase with id ${id}:`, err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.get('/api/pois', (req, res) => {
    if(!req.session.username) {
        return res.status(401).send('Unauthorized');
    }
    if(!req.session.chosenUsecase){
        return res.status(404).send('usecase not found')
    }
    const usecase_id = req.session.chosenUsecase.id
    console.log(usecase_id);
    db.query('SELECT * FROM POI WHERE usecase_id = ?', [usecase_id], (err, results) => {
        if (err) {
            console.error('Error fetching POIs:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.json(results);
    });
});

app.post('/api/pois', (req, res) => {
    const { order, name, x_coordinate, y_coordinate } = req.body;
    if(!req.session.username) {
        return res.status(401).send('Unauthorized');
    }
    const usecase_id = req.session.chosenUsecase.id
    db.query('INSERT INTO POI SET ?', { id: null, order, x_coordinate, y_coordinate, soundfile_id: "4", usecase_id, name }, (err, results) => {
        if (err) {
            console.error('Error creating POI:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('POI created successfully.');
    });
});

// Route zum Aktualisieren eines POI
app.put('/api/pois/:id', (req, res) => {
    const { id } = req.params;
    const { name, order, x_coordinate, y_coordinate, soundfile_id, usecase_id} = req.body;
    const sql = 'UPDATE POI SET `name` = ?, `order` = ?, x_coordinate = ?, y_coordinate = ?, soundfile_id = ?, usecase_id = ? WHERE id = ?';
    db.query(sql, [name, order, x_coordinate, y_coordinate, soundfile_id, usecase_id, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        res.send('POI aktualisiert!');
    });
});

app.put('/api/updatePoiSoundfile/:id', (req, res) => {
    const {id} = req.params;
    const {soundfile_id} = req.body;
    db.query('UPDATE POI SET soundfile_id = ? WHERE id = ?', [soundfile_id, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        res.send('POI aktualisiert!');
    });
})

app.put('/api/updatePoiOrder', (req, res) => {
    const newOrder = req.body.newOrder;
    console.log(newOrder)
    newOrder.forEach(poi => {
        const order = poi.order
        const id = poi.id
        db.query('UPDATE POI SET `order` = ? WHERE id = ?', [order, id], (err, results) => {
            if (err) {
                console.error('Error updating POI order:', err);
                return res.status(500).send('Internal Server Error');
            }
        });
    });

    res.send('POI order updated successfully');
});

app.delete('/api/pois/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM POI WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return res.status(500).send('Serverfehler beim Löschen der Daten');
        }

        if (result.affectedRows === 0) {
            res.status(404).send('Account nicht gefunden');
            return;
        }

        res.send(`POI mit ID ${id} gelöscht!`);
    });
});



// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const port = 1025;
//const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
