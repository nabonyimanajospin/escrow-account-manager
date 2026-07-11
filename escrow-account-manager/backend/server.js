const { connectDB } = require('./src/config/database');
const app = require('./src/app');
require('dotenv').config();

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
