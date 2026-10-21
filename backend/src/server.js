const app = require('./app');
const { initializeDatabase } = require('./database/init');
const { sequelize } = require('./models');

const port = Number(process.env.PORT || 3000);

async function start() {
  try {
    const { seeded } = await initializeDatabase();
    console.log('✓ Sequelize 模型同步完成，MySQL 数据库连接成功');
    if (seeded) console.log('✓ 已自动写入演示数据');
    app.listen(port, () => {
      console.log(`✓ 后端服务已启动：http://localhost:${port}`);
      console.log(`✓ 健康检查：http://localhost:${port}/api/health`);
    });
  } catch (error) {
    console.error('✗ 后端启动失败：', error.message);
    console.error('请检查 backend/.env 中的数据库账号和密码。');
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

start();
