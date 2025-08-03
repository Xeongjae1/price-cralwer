import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function setupRDS() {
  // 마스터 사용자로 연결 (postgres 또는 생성시 설정한 마스터 사용자명)
  const masterUrl = process.env.DATABASE_URL?.replace('crawler_user:', 'postgres:');
  console.log('🔄 Connecting with master user...');
  
  const client = new Client({
    connectionString: masterUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Master connection successful!');
    
    // 데이터베이스 생성 (이미 있으면 무시)
    try {
      await client.query('CREATE DATABASE smartstore_crawler;');
      console.log('✅ Database created');
    } catch (e) {
      console.log('ℹ️  Database might already exist');
    }

    // 사용자 생성
    try {
      await client.query(`
        CREATE USER crawler_user WITH ENCRYPTED PASSWORD 'crawler_password_2025';
      `);
      console.log('✅ User crawler_user created');
    } catch (e) {
      console.log('ℹ️  User might already exist');
    }

    // 권한 부여
    await client.query(`
      GRANT ALL PRIVILEGES ON DATABASE smartstore_crawler TO crawler_user;
    `);
    console.log('✅ Database privileges granted');

    await client.end();

    // 이제 smartstore_crawler 데이터베이스에 직접 연결
    const dbClient = new Client({
      connectionString: masterUrl?.replace('/postgres', '/smartstore_crawler'),
      ssl: {
        rejectUnauthorized: false
      }
    });

    await dbClient.connect();
    console.log('✅ Connected to smartstore_crawler database');

    // 스키마 권한 부여
    await dbClient.query(`
      GRANT ALL ON SCHEMA public TO crawler_user;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crawler_user;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crawler_user;
    `);
    console.log('✅ Schema privileges granted');

    await dbClient.end();
    console.log('🎉 RDS setup completed!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Full error:', error);
  }
}

setupRDS();
