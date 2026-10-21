const { initializeDatabase } = require('../src/database/init');
const { sequelize } = require('../src/models');

async function seed() {
  try {
    const { seeded } = await initializeDatabase();
    if (seeded) {
      console.log('演示数据初始化完成。');
      console.log('管理员：admin / admin123');
      console.log('普通用户：demo / 123456，lily / 123456');
      console.log('服务商：provider / 123456，yoga / 123456，boxing / 123456（待审核）');
    } else {
      console.log('检测到 users 表已有数据，已跳过演示数据初始化。');
    }
  } finally {
    await sequelize.close();
  }
}

seed().catch((error) => {
  console.error('演示数据初始化失败：', error);
  process.exitCode = 1;
});
