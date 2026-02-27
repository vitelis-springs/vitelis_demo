/**
 * S3 Migration Script
 * Копирует файлы из публичного бакета (vitelis-temp) в приватный (Railway)
 * и обновляет записи в MongoDB: заменяет полные URL на S3-ключи.
 *
 * Запуск: node scripts/migrate-s3.mjs
 * Откат:  node scripts/migrate-s3.mjs --rollback
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Конфиги бакетов ─────────────────────────────────────────────────────────

const OLD_BUCKET = {
  name: 'vitelis-temp',
  region: 'us-east-1',
};

const NEW_BUCKET = {
  name: process.env.AWS_S3_BUCKET,
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT_URL,
};

// ─── S3 клиент (только для нового приватного бакета) ─────────────────────────

const newS3 = new S3Client({
  region: NEW_BUCKET.region,
  credentials: {
    accessKeyId: NEW_BUCKET.accessKeyId,
    secretAccessKey: NEW_BUCKET.secretAccessKey,
  },
  endpoint: NEW_BUCKET.endpoint,
  forcePathStyle: true,
});

// ─── MongoDB схемы ────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({ logo: String }, { strict: false });
const SalesMinerSchema = new mongoose.Schema({ yamlFile: String }, { strict: false });

const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');
const SalesMinerAnalyze = mongoose.models.SalesMinerAnalyze ||
  mongoose.model('SalesMinerAnalyze', SalesMinerSchema, 'salesmineranalyzes');

const BACKUP_FILE = path.resolve('scripts/migrate-s3-backup.json');

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function extractKeyFromUrl(url) {
  // https://vitelis-temp.s3.us-east-1.amazonaws.com/company-logos/file.svg
  // → company-logos/file.svg
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

function isOldUrl(value) {
  return typeof value === 'string' && value.includes('vitelis-temp.s3');
}

function isS3Key(value) {
  return typeof value === 'string' && !value.startsWith('http');
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function getContentType(key) {
  if (key.endsWith('.svg')) return 'image/svg+xml';
  if (key.endsWith('.jpeg') || key.endsWith('.jpg')) return 'image/jpeg';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.yaml') || key.endsWith('.yml')) return 'application/x-yaml';
  return 'application/octet-stream';
}

// ─── Копирование файла ────────────────────────────────────────────────────────

async function copyFile(key) {
  console.log(`  📥 Скачиваю (публичный HTTP): ${key}`);

  // Старый бакет публичный — скачиваем через обычный HTTP без credentials
  const publicUrl = `https://${OLD_BUCKET.name}.s3.${OLD_BUCKET.region}.amazonaws.com/${key}`;
  const response = await fetch(publicUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} при скачивании ${publicUrl}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`  📤 Загружаю в новый бакет: ${key} (${buffer.length} bytes)`);

  const putCmd = new PutObjectCommand({
    Bucket: NEW_BUCKET.name,
    Key: key,
    Body: buffer,
    ContentType: getContentType(key),
  });
  await newS3.send(putCmd);

  console.log(`  ✅ Готово: ${key}`);
}

// ─── Основная миграция ────────────────────────────────────────────────────────

async function migrate() {
  console.log('\n🔌 Подключаюсь к MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB подключена\n');

  let totalFiles = 0;
  let totalUpdated = 0;
  const errors = [];
  const backup = { users: [], analyzes: [] };

  // ── users.logo ──────────────────────────────────────────────────────────────
  console.log('━━━ Коллекция: users.logo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const users = await User.find({ logo: { $exists: true, $ne: null, $ne: '' } });
  console.log(`Найдено пользователей с logo: ${users.length}\n`);

  for (const user of users) {
    const logo = user.logo;

    if (!isOldUrl(logo)) {
      console.log(`⏭️  [${user._id}] Пропускаю — уже мигрирован или не S3 URL: ${logo}`);
      continue;
    }

    const key = extractKeyFromUrl(logo);
    if (!key) {
      console.log(`⚠️  [${user._id}] Не удалось извлечь ключ из URL: ${logo}`);
      errors.push({ id: user._id, field: 'logo', error: 'bad url' });
      continue;
    }

    try {
      backup.users.push({ id: user._id.toString(), logo: logo });
      totalFiles++;
      await copyFile(key);
      await User.updateOne({ _id: user._id }, { $set: { logo: key } });
      totalUpdated++;
      console.log(`  💾 MongoDB обновлён: users[${user._id}].logo = "${key}"\n`);
    } catch (err) {
      console.error(`  ❌ Ошибка для ${user._id}:`, err.message);
      errors.push({ id: user._id, field: 'logo', error: err.message });
    }
  }

  // ── salesmineranalyzes.yamlFile ─────────────────────────────────────────────
  console.log('━━━ Коллекция: salesmineranalyzes.yamlFile ━━━━━━━━━━━━━━━━━━━━━━');
  const analyzes = await SalesMinerAnalyze.find({ yamlFile: { $exists: true, $ne: null, $ne: '' } });
  console.log(`Найдено анализов с yamlFile: ${analyzes.length}\n`);

  for (const analyze of analyzes) {
    const yamlFile = analyze.yamlFile;

    if (!isOldUrl(yamlFile)) {
      console.log(`⏭️  [${analyze._id}] Пропускаю — уже мигрирован: ${yamlFile}`);
      continue;
    }

    const key = extractKeyFromUrl(yamlFile);
    if (!key) {
      console.log(`⚠️  [${analyze._id}] Не удалось извлечь ключ из URL: ${yamlFile}`);
      errors.push({ id: analyze._id, field: 'yamlFile', error: 'bad url' });
      continue;
    }

    try {
      backup.analyzes.push({ id: analyze._id.toString(), yamlFile: yamlFile });
      totalFiles++;
      await copyFile(key);
      await SalesMinerAnalyze.updateOne({ _id: analyze._id }, { $set: { yamlFile: key } });
      totalUpdated++;
      console.log(`  💾 MongoDB обновлён: salesmineranalyzes[${analyze._id}].yamlFile = "${key}"\n`);
    } catch (err) {
      console.error(`  ❌ Ошибка для ${analyze._id}:`, err.message);
      errors.push({ id: analyze._id, field: 'yamlFile', error: err.message });
    }
  }

  // ── Сохраняем бэкап для возможного отката ───────────────────────────────────
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
  console.log(`💾 Бэкап сохранён: ${BACKUP_FILE}`);

  // ── Итог ────────────────────────────────────────────────────────────────────
  console.log('\n━━━ ИТОГ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Файлов скопировано:      ${totalFiles}`);
  console.log(`✅ Записей обновлено в БД:  ${totalUpdated}`);
  if (errors.length > 0) {
    console.log(`❌ Ошибок:                  ${errors.length}`);
    console.log('Детали ошибок:', errors);
  } else {
    console.log('🎉 Миграция завершена без ошибок!');
  }
}

// ─── Откат ────────────────────────────────────────────────────────────────────

async function rollback() {
  console.log('\n⏪ Запускаю откат миграции...');

  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌ Файл бэкапа не найден: ${BACKUP_FILE}`);
    console.error('Откат невозможен — запустите миграцию сначала.');
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
  console.log(`📂 Бэкап загружен: ${backup.users.length} users, ${backup.analyzes.length} analyzes\n`);

  console.log('🔌 Подключаюсь к MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);

  for (const u of backup.users) {
    await User.updateOne({ _id: new mongoose.Types.ObjectId(u.id) }, { $set: { logo: u.logo } });
    console.log(`✅ users[${u.id}].logo восстановлен: ${u.logo}`);
  }

  for (const a of backup.analyzes) {
    await SalesMinerAnalyze.updateOne({ _id: new mongoose.Types.ObjectId(a.id) }, { $set: { yamlFile: a.yamlFile } });
    console.log(`✅ salesmineranalyzes[${a.id}].yamlFile восстановлен: ${a.yamlFile}`);
  }

  console.log('\n✅ Откат завершён — все старые URL восстановлены в MongoDB.');
}

// ─── Точка входа ──────────────────────────────────────────────────────────────

const isRollback = process.argv.includes('--rollback');

(async () => {
  try {
    if (isRollback) {
      await rollback();
    } else {
      await migrate();
    }
  } catch (err) {
    console.error('\n💥 Критическая ошибка:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB отключена');
  }
})();
