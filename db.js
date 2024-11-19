const mysql = require('mysql');
require('dotenv').config(); //load the env variables


const DATABASE_USER = process.env.DATABASE_USER; // Use the token from .env
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD; // Use the token from .env
const DATABASE_NAME = process.env.DATABASE_NAME; // Use the token from .env
const DATABASE_HOST = process.env.DATABASE_HOST; // Use the token from .env

// Set up the connection to the MySQL database
const db = mysql.createConnection({
    host: DATABASE_HOST,
    user: DATABASE_USER,           // Replace with your MySQL username
    password: DATABASE_PASSWORD,            // Replace with your MySQL password
    database: DATABASE_NAME
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to the shanet_bingo database');
});

// Export the connection to be used in other files
module.exports = db;
