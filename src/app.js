const express = require('express');
const { pool } = require('./db');
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended:true}));
const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 2090;

app.get('/', (req, res) => {
    res.render('order');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/getOrderInfo', async (req, res) => {
    const { orderId } = req.body;
    console.log(`Broj narudzbe dobiven od korisnika: ${orderId}`);
    try {
        const data = await pool.query(`SELECT * FROM order_info WHERE order_id = '${orderId}'`);
        if (data.rows.length < 1) {
            return res.json({ message: "Unesite ispravan broj narudžbe!" });
        } else {
            return res.json(data.rows);
        }
    } catch (err) {
        if(err.code == '42601') {
            console.log("Greška!", err);
            return res.status(400).json({ error: `Greška: ${err.message}` });
        } else {
            console.log(err);
            return res.status(500).send('Došlo je do greške pri radu s bazom podataka!');
        }
    }
});

app.post('/getOrderInfoSecure', async (req, res) => {
    const { orderId } = req.body;
    console.log(`Broj narudzbe dobiven od korisnika (secure): ${orderId}`);
    try {
        const data = await pool.query("SELECT * FROM order_info WHERE order_id = $1", [orderId]);
        if (data.rows.length < 1) {
            return res.json({ message: "Unesite ispravan broj narudžbe!" });
        } else {
            return res.json(data.rows);
        }
    } catch (err) {
        console.log(err);
        return res.status(500).send('Došlo je do greške pri radu s bazom podataka!');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        console.log("Nedostaju podaci!");
        return res.status(400).send("Nedostaju korisničko ime i lozinka!");
    } else {
        let storedPass;
        try {
            const data = await pool.query("SELECT password FROM users_not_safe WHERE username = $1", [username]);
            if(data.rows.length < 1) {
                console.log("Pogrešno korisničko ime");
                return res.status(401).json({ message: 'Unijeli ste pogrešno korisničko ime!'});
            } else {
                storedPass = data.rows[0].password;
            }
        } catch (err) {
            console.log(err);
            return res.status(500).send('Došlo je do greške pri radu s bazom podataka!');
        }

        if(password === storedPass) {
            console.log(`Uspješna prijava za korisnika ${username}!`);
            return res.status(200).json({ message: `Uspješna prijava za korisnika ${username}!`});
        } else {
            console.log("Pogrešna lozinka!");
            return res.status(401).json({ message: 'Unijeli ste pogrešnu lozinku!'});
        }
    }
});

app.post('/loginSecure', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        console.log("Nedostaju podaci!");
        return res.status(400).send("Nedostaju korisničko ime i lozinka!");
    } else {
        let storedPass, numOfAtt, timeToWait;
        try {
            const data = await pool.query("SELECT password, num_try, tto_wait FROM users WHERE username = $1", [username]);
            if(data.rows.length < 1) {
                console.log("Podaci za pristup su pogrešni! /1");
                return res.status(401).json({ message: 'Podaci za pristup su pogrešni!'});
            } else {
                storedPass = data.rows[0].password;
                numOfAtt = data.rows[0].num_try;
                timeToWait = data.rows[0].tto_wait;
                timeToWait = (typeof timeToWait === "string" ? new Date(timeToWait) : timeToWait);
            }
        } catch (err) {
            console.log(err);
            return res.status(500).send('Došlo je do greške pri radu s bazom podataka!');
        }

        if(timeToWait > new Date()) {
            let numOfSec = Math.round((timeToWait - new Date()) / 1000);
            return res.status(429).json({ message: `Neuspješno ste se prijavili 3 puta zaredom. Sačekajte ${numOfSec} sekundi prije sljedeće prijave.`});
        } else if(numOfAtt >= 3) {
            numOfAtt = 0;
                try {
                    const attempts = await pool.query("UPDATE users SET num_try = $1 WHERE username = $2 RETURNING *;", [numOfAtt, username]);
                } catch (err) {
                    console.log(err);
                    return res.status(500).send('Došlo je do greške pri radu s bazom podataka!');
                }
        }

        if(bcrypt.compareSync(password, storedPass)) {
            if(numOfAtt > 0) {
                numOfAtt = 0;
                try {
                    const attempts = await pool.query("UPDATE users SET num_try = $1 WHERE username = $2 RETURNING *;", [numOfAtt, username]);
                } catch (err) {
                    console.log(err);
                    return res.status(500).send('Došlo je do greške pri radu s bazom podataka!');
                }
            }
            console.log(`Uspješna prijava za korisnika ${username}!`);
            return res.status(200).json({ message: `Uspješna prijava za korisnika ${username}!`});
        } else {
            console.log("Podaci za pristup su pogrešni! /2");
            numOfAtt++;
            try {
                if (numOfAtt >= 3) {
                    let newTime = new Date(Date.now() + 5*60*1000);
                    const lockUsr = await pool.query("UPDATE users SET num_try = $1, tto_wait = $2 WHERE username = $3 RETURNING *;", [numOfAtt, newTime, username]);
                    return res.status(401).json({ message: 'Podaci za pristup su pogrešni! Možete pokušati ponovno za 5 minuta.'});
                } else {
                    const lockUsr = await pool.query("UPDATE users SET num_try = $1 WHERE username = $2 RETURNING *;", [numOfAtt, username]);
                    return res.status(401).json({ message: 'Podaci za pristup su pogrešni!'});
                }
            } catch(err) {
                console.log(err);
                return res.status(500).send('Došlo je do greške pri radu s bazom podataka!');
            }
        }
    }
});

if (externalUrl) {
    const hostname = '0.0.0.0';
    app.listen(port, hostname, () => {
        console.log(`Server locally running at http://${hostname}:${port}/ and from
    outside on ${externalUrl}`);
    });
} else {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}/`);
    });
}