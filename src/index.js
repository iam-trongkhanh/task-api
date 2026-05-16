const express = require('express');
const pool = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

app.use('/tasks', taskRoutes);

const initDb = async () => {
  try {
    const initSql = fs.readFileSync(path.join(__dirname, 'models/init.sql'), 'utf8');
    await pool.query(initSql);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database', err);
  }
};

const PORT = 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query('SELECT NOW()'); 
      await initDb();
      break;
    } catch (err) {
      console.log(`DB connection failed. Retries left: ${retries - 1}`);
      retries -= 1;
      await new Promise(res => setTimeout(res, 2000));
    }
  }
});
//add feature
//add feature 2