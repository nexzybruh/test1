const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const crypto = require('crypto');
const axios = require('axios');

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sync'
});

const verifyToken = (token, callback) => {
    const query = 'SELECT * FROM tokens WHERE token = ?';
    db.query(query, [token], (err, results) => {
        if (err) {
            return callback({ status: 500, error: err });
        }

        if (results.length > 0) {
            const tokenData = results[0];
            const currentTime = new Date();
            const expirationTime = new Date(tokenData.duration);

            if (expirationTime > currentTime) {
                return callback(null, tokenData);
            } else {
                return callback({ status: 403, message: 'Token has expired' });
            }
        } else {
            return callback({ status: 404, message: 'Token not found' });
        }
    });
};

const incrementLimit = (token, callback) => {
    const today = new Date().toISOString().split('T')[0];
    const checkLimitQuery = 'SELECT * FROM limite WHERE token = ?';

    db.query(checkLimitQuery, [token], (err, results) => {
        if (err) {
            return callback(err);
        }

        const record = results[0];

        if (record) {
            const recordDate = new Date(record.date);
            if (recordDate.toISOString().split('T')[0] !== today) {
                db.query('UPDATE limite SET value = 0, date = ? WHERE token = ?', [today, token], (err) => {
                    return callback(err);
                });
            } else if (record.value >= 3000) {
                return callback({ status: 403, message: 'Daily limit of 3000 reached' });
            } else {
                db.query('UPDATE limite SET value = value + 1 WHERE token = ?', [token], (err) => {
                    return callback(err);
                });
            }
        } else {
            db.query('INSERT INTO limite (token, value, date) VALUES (?, 1, ?)', [token, today], (err) => {
                return callback(err);
            });
        }
    });
};

router.get('/cpf/:token/:cpf', async (req, res) => {
    const { token, cpf } = req.params;

    verifyToken(token, (err) => {
        if (err) {
            return res.status(err.status).json(err);
        }

        incrementLimit(token, async (err) => {
            if (err) {
                return res.status(err.status).json(err);
            }

            try {
                const response = await axios.get(`https://besh-api.org/apis/fotosp.php?query=${cpf}&token=5eec4806-dd69-4092-9433-c065cf643433`);
                res.json(response.data);
            } catch (error) {
                return res.status(500).json({ error: 'Error fetching data from external API' });
            }
        });
    });
});

module.exports = router;
