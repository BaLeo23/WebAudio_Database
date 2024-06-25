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
app.use((request, response, next) => {
    console.log(`${request.method} ${request.url}`);
    next();
});
 
app.get('/loginUser', (request, response) => {
    console.log(request.session);
    console.log(request.session.id)
    request.session.isLoggedIn = true
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

app.get('/logout', (request, response) => {
    request.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            response.send(true)
        }
    });
});

// Account Routes
app.get('/accounts', (request, response) => {
    db.query('SELECT * FROM Account', (err, results) => {
        if (err) {
            console.error('Error fetching accounts:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.json(results);
    });
});

app.post('/accounts', async (request, response) => {
    const { username, password, email } = request.body;
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        db.query('INSERT INTO Account SET ?', {username, password: hashedPassword, email}, (err, results) => {
            if (err) {
                console.error('Error creating account:', err);
                response.status(500).send('Internal Server Error');
                return;
            }
            response.send('Account created successfully.');
        });
    }catch (error) {
        console.error('Error hashing password:', error);
        response.status(500).send('Internal Server Error');
   }
});


// Route zum Aktualisieren eines Accounts
app.put('/accounts/:username', (request, response) => {
    const { username } = request.params;
    const { password, email } = request.body;
    const sql = 'UPDATE Account SET password = ?, email = ? WHERE username = ?';
    db.query(sql, [password, email, username], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return response.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        response.send(`Account mit Username ${username} aktualisiert!`);
    });
});



// Route zum Löschen eines Accounts
app.delete('/accounts/:username', (request, response) => {
    const { username } = request.params;
    const sql = 'DELETE FROM Account WHERE username = ?';
    db.query(sql, [username], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return response.status(500).send('Serverfehler beim Löschen der Daten');
        }

        if (result.affectedRows === 0) {
            response.status(404).send('Account nicht gefunden');
            return;
        }

        response.send(`Account mit Username ${username} gelöscht!`);
    });
});


/*
// Route zum Aktualisieren eines Soundfiles
app.put('/soundfiles/:id', (request, response) => {
    const { id } = request.params;
    const { filename, filepath, upload_date, account_username } = request.body;
    const sql = 'UPDATE Soundfile SET filename = ?, filepath = ?, upload_date = upload_date, account_username = ? WHERE id = ?';
    db.query(sql, [filename, filepath, upload_date, account_username], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            response.status(500).send('Serverfehler');
            return;
        }
        if (result.affectedRows === 0) {
            response.status(404).send('Soundfile nicht gefunden');
            return;
        }
        response.send('Soundfile aktualisiert!');
    });
});
*/



// Soundfile Routes
app.get('/soundfiles', (request, response) => {
    db.query('SELECT * FROM Soundfile', (err, results) => {
        if (err) {
            console.error('Error fetching soundfiles:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.json(results);
    });
});

app.post('/soundfiles', (request, response) => {
    const { id, filename, filepath, upload_date, account_username } = request.body;
    db.query('INSERT INTO Soundfile SET ?', { id, filename, filepath, upload_date, account_username }, (err, results) => {
        if (err) {
            console.error('Error creating account:', err);
            response.status(500).send('Serverfehler');
            return;
        }
        response.send('Soundfile created successfully.');
    });
});

// Route zum Aktualisieren eines Soundfiles
app.put('/soundfiles/:id', (request, response) => {
    const { id } = request.params;
    const { filename, filepath, upload_date, account_username } = request.body;
    const sql = 'UPDATE Soundfile SET filename = ?, filepath = ?, upload_date = ?, account_username = ? WHERE id = ?';
    db.query(sql, [filename, filepath, upload_date, account_username, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return response.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }

        if (result.affectedRows === 0) {
            return response.status(404).send('Soundfile nicht gefunden');
        }

        response.send(`Soundfile mit ID ${id} aktualisiert!`);
    });
});

app.delete('/soundfiles/:id', (request, response) => {
    const { id } = request.params;
    const sql = 'DELETE FROM Soundfile WHERE id = ?';

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return response.status(500).send('Serverfehler');

        }
        if (result.affectedRows === 0) {
            return response.status(404).send('Soundfile nicht gefunden');

        }
        response.send('Soundfile gelöscht!');
    });
});




// Progress Routes
app.get('/progress', (request, response) => {
    db.query('SELECT * FROM Progress', (err, results) => {
        if (err) {
            console.error('Error fetching progress:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.json(results);
    });
});

app.post('/progress', (request, response) => {
    const { id, found, account_username, poi_id } = request.body;
    db.query('INSERT INTO Progress SET ?', { id, found, account_username, poi_id }, (err, results) => {
        if (err) {
            console.error('Error creating progress:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.send('Progress created successfully.');
    });
});


app.put('/progress/:id', (request, response) => {
    const { id } = request.params;
    const { found, account_username, poi_id } = request.body;
    const sql = 'UPDATE Progress SET found = ?, account_username = ?, poi_id = ? WHERE id = ?';
    db.query(sql, [found, account_username, poi_id, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return response.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        response.send(`Progress mit ID ${id} aktualisiert!`);
    });
});


app.delete('/progress/:id', (request, response) => {
    const { id } = request.params;
    const sql = 'DELETE FROM Progress WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return response.status(500).send('Serverfehler beim Löschen der Daten');
        }

        if (result.affectedRows === 0) {
            response.status(404).send('Progress nicht gefunden');
            return;
        }

        response.send(`Progress mit ID ${id} gelöscht!`);
    });
});


// Usecase Routes
app.get('/usecasesClient', (request, response) => {
    console.log(request.session)
    console.log(request.session.id)
    if(!request.session.isLoggedIn) {
        return response.status(401).send('Unauthorized');
    }
    db.query('SELECT * FROM Usecase', (err, results) => {
        if (err) {
            console.error('Error fetching usecases:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.json(results);
    });
});


app.get('/usecasesAdmin', (request, response) => {
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

app.post('/usecasesAdmin', (request, response) => {
    const { titel, beschreibung } = request.body;
    if(!request.session.username){
        return response.status(401).send('Unauthorized');
    }
    const account_username = request.session.username;
    db.query('INSERT INTO Usecase SET ?', { id: null, titel, beschreibung, fixed_order: '0', qr_code: "1234", account_username }, (err, results) => {
        if (err) {
            console.error('Error creating usecase:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.send('Usecase created successfully.');
    });
});

app.post('/usecases', (request, response) => {
    const { id, titel, beschreibung, fixed_order, qr_code, account_username } = request.body;
    db.query('INSERT INTO Usecase SET ?', { id, titel, beschreibung, fixed_order, qr_code, account_username }, (err, results) => {
        if (err) {
            console.error('Error creating usecase:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.send('Usecase created successfully.');
    });
});

// Route zum Aktualisieren eines Usecases
app.put('/usecases/:id', (request, response) => {
    const { id } = request.params;
    const { titel, beschreibung, fixed_order, qr_code, account_username } = request.body;
    const sql = 'UPDATE Usecase SET titel = ?, beschreibung = ?, fixed_order = ?, qr_code = ?, account_username = ? WHERE id = ?';
    db.query(sql, [titel, beschreibung, fixed_order, qr_code, account_username, id], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return response.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        response.send(`Usecase mit ID ${id} aktualisiert!`);
    });
});


app.delete('/usecases/:id', (request, response) => {
    const { id } = request.params;
    const sql = 'DELETE FROM Usecase WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return response.status(500).send('Serverfehler beim Löschen der Daten');
        }

        if (result.affectedRows === 0) {
            response.status(404).send('Usecase nicht gefunden');
            return;
        }

        response.send(`Usecase mit ID ${id} gelöscht!`);
    });
});

app.post('/chosenUseCase', (request, response) => {
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
        request.session.chosenUsecase = results[0];
        response.send(true);
    });
})



// POI Routes
app.get('/pois', (request, response) => {
    if(!request.session.isLoggedIn) {
        return response.status(401).send('Unauthorized');
    }
    const usecase_id = request.session.chosenUsecase.id
    console.log(usecase_id);
    db.query('SELECT * FROM POI WHERE usecase_id = ?', [usecase_id], (err, results) => {
        if (err) {
            console.error('Error fetching POIs:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.json(results);
    });
});

app.post('/pois', (request, response) => {
    const { order, name, x_coordinate, y_coordinate } = request.body;
    if(!request.session.username) {
        return response.status(401).send('Unauthorized');
    }
    const usecase_id = request.session.chosenUsecase.id
    db.query('INSERT INTO POI SET ?', { id: null, order, x_coordinate, y_coordinate, soundfile_id: "1", usecase_id, name }, (err, results) => {
        if (err) {
            console.error('Error creating POI:', err);
            response.status(500).send('Internal Server Error');
            return;
        }
        response.send('POI created successfully.');
    });
});

// Route zum Aktualisieren eines POI
app.put('/pois/:id', (request, response) => {
    const { id } = request.params;
    const { order, x_coordinate, y_coordinate, soundfile_id, usecase_id, name} = request.body;
    const sql = 'UPDATE POI SET `order` = ?, x_coordinate = ?, y_coordinate = ?, soundfile_id = ?, usecase_id = ? WHERE id = ?';
    db.query(sql, [order, x_coordinate, y_coordinate, soundfile_id, usecase_id, id, name], (err, result) => {
        if (err) {
            console.error('Fehler beim Aktualisieren der Daten:', err);
            return response.status(500).send('Serverfehler beim Aktualisieren der Daten');
        }
        response.send('POI aktualisiert!');
    });
});


app.delete('/pois/:id', (request, response) => {
    const { id } = request.params;
    const sql = 'DELETE FROM POI WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Fehler beim Löschen der Daten:', err);
            return response.status(500).send('Serverfehler beim Löschen der Daten');
        }

        if (result.affectedRows === 0) {
            response.status(404).send('Account nicht gefunden');
            return;
        }

        response.send(`POI mit ID ${id} gelöscht!`);
    });
});



// Error handling middleware
app.use((err, request, response, next) => {
    console.error(err.stack);
    response.status(500).send('Something broke!');
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
