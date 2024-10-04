// routes/login.js
const express = require('express');
const mysql = require('mysql');

const router = express.Router();

// Conexão com o banco de dados (pode ser movido para um arquivo separado)
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sync'
});

// Endpoint de login
router.get('/login/:token', (req, res) => {
    const token = req.params.token;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    // Verificar o token no banco de dados
    const query = 'SELECT * FROM tokens WHERE token = ?';
    db.query(query, [token], (err, results) => {
        if (err) {
            console.error('[!] Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            const tokenData = results[0];
            const currentTime = new Date();
            const expirationTime = new Date(tokenData.duration);

            if (expirationTime > currentTime) {
                // Token válido
                return res.json({ message: 'Login successful', userId: tokenData }); // Supondo que o userId esteja no tokenData
            } else {
                return res.status(403).json({ error: 'Token has expired' });
            }
        } else {
            return res.status(404).json({ error: 'Token not found' });
        }
    });
});

module.exports = router;
