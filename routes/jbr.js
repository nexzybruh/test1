const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const crypto = require('crypto');

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sync'
});

const generateToken = () => {
    return crypto.createHash('md5').update(Date.now().toString()).digest('hex');
};

const formatName = (nome) => {
    const parts = nome.trim().split(' ');
    if (parts.length > 1) {
        return parts[0] + '%' + parts.slice(1).join(' ').replace(/ /g, '%') + '%';
    }
    return nome + '%'; 
};

const incrementLimit = (token, callback) => {
    const today = new Date().toISOString().split('T')[0];
    const checkLimitQuery = 'SELECT * FROM limite WHERE token = ?';

    db.query(checkLimitQuery, [token], (err, results) => {
        if (err) {
            return callback(err);
        }

        const now = new Date();
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

router.get('/datanasc/:token/:nome/:dataNascimento', (req, res) => {
    const { token, nome, dataNascimento } = req.params;

    verifyToken(token, (err) => {
        if (err) {
            return res.status(err.status).json(err);
        }

        incrementLimit(token, (err) => {
            if (err) {
                return res.status(err.status).json(err);
            }

            const formattedName = formatName(nome);
            const formattedDate = dataNascimento.replace(/-/g, '/');
            const query = 'SELECT * FROM jbr_temp WHERE `Nome Completo` LIKE ? AND `Data de Nascimento` = ? LIMIT 200';

            db.query(query, [`${formattedName}`, formattedDate], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json(results);
            });
        });
    });
});

router.get('/nome/:token/:nome', (req, res) => {
    const { token, nome } = req.params;

    verifyToken(token, (err) => {
        if (err) {
            return res.status(err.status).json(err);
        }

        incrementLimit(token, (err) => {
            if (err) {
                return res.status(err.status).json(err);
            }

            const formattedName = formatName(nome);
            const query = 'SELECT * FROM jbr_temp WHERE `Nome Completo` LIKE ? LIMIT 200';
            
            db.query(query, [`${formattedName}`], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: err });
                }
                res.json(results);
            });
        });
    });
});

router.get('/cpf/:token/:cpf', (req, res) => {
    const { token, cpf } = req.params;

    verifyToken(token, (err) => {
        if (err) {
            return res.status(err.status).json(err);
        }

        incrementLimit(token, (err) => {
            if (err) {
                return res.status(err.status).json(err);
            }

            const query = 'SELECT * FROM jbr_temp WHERE `CPF` = ? LIMIT 1';
            
            db.query(query, [cpf], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json(results);
            });
        });
    });
});

router.post('/token', (req, res) => {
    const token = generateToken();
    const query = 'INSERT INTO tokens (token, duration) VALUES (?, NOW() + INTERVAL 1 HOUR)';
    db.query(query, [token], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ token });
    });
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

module.exports = router;
