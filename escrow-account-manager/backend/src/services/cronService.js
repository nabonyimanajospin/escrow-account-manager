const cron = require('node-cron');
const { Op } = require('sequelize');
const { Transaction, Property, AuditLog, sequelize, Dispute, Escrow, User, WalletTransaction } = require('../models');
const ledgerService = require('./ledgerService');
const notificationService = require('./notificationService');

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
            transaction.status = 'CANCELLED';
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

  // Runs every hour to check for overdue disputes
  cron.schedule('0 * * * *', async () => {
    try {
      const overdueDisputes = await Dispute.findAll({
        where: {
          status: { [Op.notIn]: ['RESOLVED'] },
          resolutionDeadline: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24h cooling-off buffer
        }
      });

      if (overdueDisputes.length > 0) {
        console.log(`[Cron] Found ${overdueDisputes.length} overdue disputes. Auto-resolving...`);

        for (const dispute of overdueDisputes) {
          const transaction = await Transaction.findByPk(dispute.transactionId);
          if (!transaction) continue;
          
          const escrow = await Escrow.findByPk(transaction.escrowAccountId);
          if (!escrow) continue;

          await sequelize.transaction(async (t) => {
            const amount = parseFloat(escrow.balance);
            
            // Mark dispute and transaction as refunded
            await dispute.update({
              status: 'RESOLVED',
              mediatorDecision: 'REFUND_TO_BUYER',
              mediatorNotes: 'Auto-resolved due to deadline expiration.'
            }, { transaction: t });

            await escrow.update({ balance: 0.00, status: 'REFUNDED' }, { transaction: t });
            await transaction.update({ status: 'REFUNDED', refundDate: new Date() }, { transaction: t });
            await Property.update({ status: 'AVAILABLE' }, { where: { id: transaction.propertyId }, transaction: t });

            // Bookkeeping entries
            await ledgerService.recordEntry({
              transactionId: transaction.id,
              escrowAccountId: escrow.id,
              type: 'DEBIT',
              amount,
              accountType: 'ESCROW_CUSTODY',
              description: 'Debit custody balance to return to buyer (Auto-Resolved Dispute)',
            }, t);

            await ledgerService.recordEntry({
              transactionId: transaction.id,
              escrowAccountId: escrow.id,
              type: 'CREDIT',
              amount,
              accountType: 'BUYER_CASH',
              description: 'Credit return of deposit to buyer account (Auto-Resolved Dispute)',
            }, t);

            // Credit the buyer's wallet!
            const buyerUser = await User.findByPk(transaction.buyerId, { transaction: t, lock: t.LOCK.UPDATE });
            if (buyerUser) {
              await buyerUser.update({ walletBalance: parseFloat(buyerUser.walletBalance || 0) + amount }, { transaction: t });
              await WalletTransaction.create({
                userId: buyerUser.id,
                type: 'CREDIT',
                amount,
                notes: 'Refund from Auto-Resolved dispute on transaction ' + transaction.id,
                status: 'COMPLETED',
              }, { transaction: t });
            }

            const logMsg = `System auto-resolved Dispute #${dispute.id} (Deadline Expired) and refunded escrow balance of $${amount} to Buyer.`;
            await AuditLog.create({
              transactionId: transaction.id,
              userId: transaction.buyerId,
              userName: 'SYSTEM_DAEMON',
              userRole: 'SYSTEM',
              action: logMsg,
              ipAddress: '127.0.0.1',
              userAgent: 'SYSTEM_DAEMON',
            }, { transaction: t });

            // Notify buyer
            if (buyerUser && buyerUser.email) {
              await notificationService.sendTransactionStatusEmail(buyerUser.email, buyerUser.name, 'REFUNDED', transaction.id, amount);
              await notificationService.createInAppNotification(buyerUser.id, 'Dispute Resolved', `The dispute on transaction ${transaction.id} was auto-resolved in your favor. $${amount} has been refunded.`);
            }

            // Notify seller
            const sellerUser = await User.findByPk(transaction.sellerId, { transaction: t });
            if (sellerUser && sellerUser.email) {
              await notificationService.sendTransactionStatusEmail(sellerUser.email, sellerUser.name, 'REFUNDED', transaction.id, amount);
              await notificationService.createInAppNotification(sellerUser.id, 'Dispute Auto-Resolved', `The dispute on transaction ${transaction.id} was auto-resolved in buyer's favor due to deadline expiration. $${amount} was refunded to the buyer.`);
            }
          });
          console.log(`[Cron] Auto-resolved dispute ${dispute.id} for transaction ${transaction.id}.`);
        }
      }
    } catch (error) {
      console.error('[Cron] Error running dispute deadline job:', error);
    }
  });
};

module.exports = { startCronJobs };
