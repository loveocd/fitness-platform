const { ensureDatabase } = require('../config/orm');
const { sequelize, User } = require('../models');
const seedDemoData = require('./seed');

async function initializeDatabase() {
  await ensureDatabase();
  await sequelize.authenticate();
  await sequelize.sync({
    alter: process.env.DB_SYNC_ALTER === 'true'
  });

  let seeded = false;
  if (process.env.AUTO_SEED !== 'false' && (await User.count()) === 0) {
    await seedDemoData();
    seeded = true;
  }

  return { seeded };
}

module.exports = { initializeDatabase };
