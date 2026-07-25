const cron = require('node-cron');
const { Op } = require('sequelize');
const { Transaction, Property, AuditLog, sequelize } = require('../models');

// Runs every minute to auto-expire PENDING transactions older than 10 minutes
const startCronJobs = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const EXPIRATION_LIMIT = 10 * 60 * 1000;
      const expirationThreshold = new Date(Date.now() - EXPIRATION_LIMIT);

      const pendingTransactions = await Transaction.findAll({
        where: {
          status: 'PENDING',
          createdAt: {
            [Op.lt]: expirationThreshold,
          },
        },
      });

      if (pendingTransactions.length > 0) {
        console.log(`[Cron] Found ${pendingTransactions.length} expired PENDING transactions. Canceling...`);

        for (const transaction of pendingTransactions) {
          await sequelize.transaction(async (t) => {
            transaction.status = 'REFUNDED';
            await transaction.save({ transaction: t });

            // Unlock property back to AVAILABLE
            await Property.update(
              { status: 'AVAILABLE' },
              { where: { id: transaction.propertyId }, transaction: t }
            );

            // Log to immutable block ledger
            await AuditLog.create(
              {
                transactionId: transaction.id,
                userId: transaction.buyerId,
                userName: 'SYSTEM_DAEMON',
                userRole: 'SYSTEM',
                action: 'AUTO_CANCEL_EXPIRED_PENDING',
                ipAddress: '127.0.0.1',
                userAgent: 'SYSTEM_DAEMON',
              },
              { transaction: t }
            );
          });
          console.log(`[Cron] Canceled transaction ${transaction.id} and unlocked property ${transaction.propertyId}.`);
        }
      }
    } catch (error) {
      console.error('[Cron] Error running expiration job:', error);
    }
  });

  console.log('Cron jobs started.');
};

module.exports = { startCronJobs };
