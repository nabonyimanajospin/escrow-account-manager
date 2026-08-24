const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { lookupParcel, executeIremboMutation } = require('../controllers/iremboController');

router.use(protect);

router.get('/lookup-parcel', lookupParcel);
router.post('/execute-mutation', executeIremboMutation);

module.exports = router;
