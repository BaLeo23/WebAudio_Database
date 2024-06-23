const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

app.use(express.json());
app.use(bodyParser.json());

app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true
}));

app.use(session({
    secret: 'kIDhEhgpshfnr',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 * 10}
}));

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
 
app.get('/', (request, response) => {
    console.log(request.session);
    console.log(request.session.id)
    request.session.logged = true
    response.status(201).send("Hello")
})

app.post('/loginAdmin', async (request, response) => {
    const { username, password } = request.body;
    try {
        db.query('SELECT * FROM account WHERE username = ?', [username], async (err, results) => {
            if (err) {
                console.error('Error fetching accounts:', err);
                response.status(500).send('Internal Server Error');
                return;
            }
            if (results.length === 0) {
                return response.status(400).send('Invalid credentials');
            }

            const user = results[0];
            console.log('User found:', user)
            console.log(user.password)
            
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return response.status(400).send('Invalid credentials');
            }
            request.session.isLoggedIn = true;
            console.log(user.username)
            request.session.username = user.username;
            console.log(request.session);
            console.log(request.session.id);
            response.send(true);
        });
    } catch (error) {
        console.error('Error processing login:', error);
        response.status(500).send('Internal Server Error');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            res.send(true)
        }
    });
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

app.post('/accounts', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        db.query('INSERT INTO Account SET ?', {username, password: hashedPassword, email}, (err, results) => {
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
app.put('/accounts/:username', (req, res) => {
    const { username } = req.params;
    const { password, email } = req.body;
    const sql = 'UPDATE Account SET password = ?, email = ? WHERE username = ?';
    db.query(sql, [password, email, username], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        res.send(`Account mit Username ${username} aktualisiert!`);
    });
});



// Route zum Löschen eines Accounts
app.delete('/accounts/:username', (req, res) => {
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


/*
// Route zum Aktualisieren eines Soundfiles
app.put('/soundfiles/:id', (req, res) => {
    const { id } = req.params;
    const { filename, filepath, upload_date, account_username } = req.body;
    const sql = 'UPDATE Soundfile SET filename = ?, filepath = ?, upload_date = upload_date, account_username = ? WHERE id = ?';
    db.query(sql, [filename, filepath, upload_date, account_username], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            res.status(500).send('Serverfehler');
            return;
        }
        if (result.affectedRows === 0) {
            res.status(404).send('Soundfile nicht gefunden');
            return;
        }
        res.send('Soundfile aktualisiert!');
    });
});
*/



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
    const { id, filename, filepath, upload_date, account_username } = req.body;
    db.query('INSERT INTO Soundfile SET ?', { id, filename, filepath, upload_date, account_username }, (err, results) => {
        if (err) {
            console.error('Error creating account:', err);
            res.status(500).send('Serverfehler');
            return;
        }
        res.send('Soundfile created successfully.');
    });
});

// Route zum Aktualisieren eines Soundfiles
app.put('/soundfiles/:id', (req, res) => {
    const { id } = req.params;
    const { filename, filepath, upload_date, account_username } = req.body;
    const sql = 'UPDATE Soundfile SET filename = ?, filepath = ?, upload_date = ?, account_username = ? WHERE id = ?';
    db.query(sql, [filename, filepath, upload_date, account_username, id], (err, result) => {
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

app.delete('/soundfiles/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM Soundfile WHERE id = ?';

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return res.status(500).send('Serverfehler');

        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Soundfile nicht gefunden');

        }
        res.send('Soundfile gelöscht!');
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
    const { id, found, account_username, poi_id } = req.body;
    db.query('INSERT INTO Progress SET ?', { id, found, account_username, poi_id }, (err, results) => {
        if (err) {
            console.error('Error creating progress:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('Progress created successfully.');
    });
});


app.put('/progress/:id', (req, res) => {
    const { id } = req.params;
    const { found, account_username, poi_id } = req.body;
    const sql = 'UPDATE Progress SET found = ?, account_username = ?, poi_id = ? WHERE id = ?';
    db.query(sql, [found, account_username, poi_id, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        res.send(`Progress mit ID ${id} aktualisiert!`);
    });
});


app.delete('/progress/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM Progress WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return res.status(500).send('Serverfehler beim Löschen der Daten');
        }

        if (result.affectedRows === 0) {
            res.status(404).send('Progress nicht gefunden');
            return;
        }

        res.send(`Progress mit ID ${id} gelöscht!`);
    });
});


// Usecase Routes

app.get('/usecases', (request, response) => {
    console.log(request.session)
    console.log(request.session.id)
    console.log(request.session.username)
    if(!request.session.username) {
        return response.status(401).send('Unauthorized');
    }
    const username = request.session.username;
    console.log(username);
    db.query('SELECT * FROM Usecase WHERE account_username = ?', [username], (err, results) => {
        if (err) {
            console.error('Error fetching usecases:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.json(results);
    });
});


app.post('/usecases', (req, res) => {
    const { id, titel, beschreibung, fixed_order, qr_code, account_username } = req.body;
    db.query('INSERT INTO Usecase SET ?', { id, titel, beschreibung, fixed_order, qr_code, account_username }, (err, results) => {
        if (err) {
            console.error('Error creating usecase:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('Usecase created successfully.');
    });
});

// Route zum Aktualisieren eines Usecases
app.put('/usecases/:id', (req, res) => {
    const { id } = req.params;
    const { titel, beschreibung, fixed_order, qr_code, account_username } = req.body;
    const sql = 'UPDATE Usecase SET titel = ?, beschreibung = ?, fixed_order = ?, qr_code = ?, account_username = ? WHERE id = ?';
    db.query(sql, [titel, beschreibung, fixed_order, qr_code, account_username, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        res.send(`Usecase mit ID ${id} aktualisiert!`);
    });
});


app.delete('/usecases/:id', (req, res) => {
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

app.post('/choosenUseCase', (request, response) => {
    const {id} = request.body
    if(!request.session.username) {
        return response.status(401).send('Unauthorized');
    }
    if(!id){
        return response.send('requeste id is null');
    }
    db.query('SELECT * FROM Usecase WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching usecases:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        console.log(results[0]);
        request.session.choosenUsecase = results[0];
        response.send(true);
    });
})



// POI Routes
app.get('/pois', (req, res) => {
    if(!req.session.username) {
        return res.status(401).send('Unauthorized');
    }
    const usecase_id = req.session.choosenUsecase.id
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

app.post('/pois', (req, res) => {
    const { id, order, x_coordinate, y_coordinate, soundfile_id, usecase_id } = req.body;
    db.query('INSERT INTO POI SET ?', { id, order, x_coordinate, y_coordinate, soundfile_id, usecase_id }, (err, results) => {
        if (err) {
            console.error('Error creating POI:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('POI created successfully.');
    });
});

// Route zum Aktualisieren eines POI
app.put('/pois/:id', (req, res) => {
    const { id } = req.params;
    const { order, x_coordinate, y_coordinate, soundfile_id, usecase_id} = req.body;
    const sql = 'UPDATE POI SET `order` = ?, x_coordinate = ?, y_coordinate = ?, soundfile_id = ?, usecase_id = ? WHERE id = ?';
    db.query(sql, [order, x_coordinate, y_coordinate, soundfile_id, usecase_id, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return res.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        res.send('POI aktualisiert!');
    });
});


app.delete('/pois/:id', (req, res) => {
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

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
