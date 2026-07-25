const { connectDB } = require('./src/config/database');
const app = require('./src/app');
const { startCronJobs } = require('./src/services/cronService');
require('dotenv').config();

connectDB();
startCronJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
