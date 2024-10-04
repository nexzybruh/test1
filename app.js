const express = require('express');
const mysql = require('mysql');
const jbrRouter = require('./routes/jbr');
const path = require('path'); // Import path module

const app = express();
app.use(express.json());

// Serve static files from the public_html directory
app.use(express.static(path.join(__dirname, 'public_html')));

// Serve index.html at the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public_html', 'index.html'));
});

app.use('/receita', jbrRouter);

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sync'
});

db.connect((err) => {
    if (err) {
        console.error('[!] mysql error:', err);
        return;
    }
    console.log('[!] mysql running');
});

const verifyToken = (token, callback) => {
    if (!token) {
        return callback({ status: 400, error: 'Token is required' });
    }

    const query = 'SELECT * FROM tokens WHERE token = ?';
    db.query(query, [token], (err, results) => {
        if (err) {
            return callback({ status: 500, error: 'Database error' });
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

app.listen(80, () => {
    console.log('[!] server running on http://localhost:80');
});
