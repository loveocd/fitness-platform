const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();

const database = process.env.DB_NAME || 'fitness_platform';

const sequelize = new Sequelize(
  database,
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    timezone: '+08:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      freezeTableName: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

function safeDatabaseName() {
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('DB_NAME 只能包含字母、数字和下划线');
  }
  return database;
}

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${safeDatabaseName()}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

module.exports = { sequelize, ensureDatabase, database };
