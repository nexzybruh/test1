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

router.get('/datanasc/:token/:nome/:dataNascimento', (req, res) => {
    const { token, nome, dataNascimento } = req.params;

    verifyToken(token, (err) => {
        if (err) {
            return res.status(err.status).json(err);
        }

        const formattedName = formatName(nome);
        
        // Replace dashes with slashes in the date of birth
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

router.get('/nome/:token/:nome', (req, res) => {
    const { token, nome } = req.params;

    verifyToken(token, (err) => {
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

router.get('/cpf/:token/:cpf', (req, res) => {
    const { token, cpf } = req.params;

    verifyToken(token, (err) => {
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

module.exports = router;
