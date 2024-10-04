const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sync'
});

// Rota para mostrar o total de consultas diárias para um token específico
router.get('/consultations/:token', (req, res) => {
    const { token } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const query = 'SELECT SUM(value) AS total FROM limite WHERE token = ? AND date = ?';

    db.query(query, [token, today], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ total: results[0].total || 0 });
    });
});

// Rota para mostrar rotas disponíveis
router.get('/routes', (req, res) => {
    const query = 'SELECT id, name, route FROM base';

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

module.exports = router;
