require('dotenv').config();
const { connectDB } = require('./src/config/database');
const app = require('./src/app');
const { startCronJobs } = require('./src/services/cronService');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    startCronJobs();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
