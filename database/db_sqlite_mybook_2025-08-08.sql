--
-- SQLiteStudio v3.4.17 生成的文件，周五 8月 8 00:26:38 2025
--
-- 所用的文本编码：UTF-8
--
PRAGMA foreign_keys = off;

-- 表：tb_admin
DROP TABLE IF EXISTS tb_admin;
CREATE TABLE IF NOT EXISTS "tb_admin" (
  "id" INTEGER,
  "username" TEXT NOT NULL,
  "password" TEXT,
  "create_time" INTEGER,
  PRIMARY KEY ("id"),
  UNIQUE ("username" ASC)
);
INSERT INTO tb_admin (id, username, password, create_time) VALUES (1, 'admin', '21232f297a57a5a743894a0e4a801fc3', datetime('now'));

-- 索引：idx_admin_username
DROP INDEX IF EXISTS idx_admin_username;
CREATE INDEX IF NOT EXISTS idx_admin_username ON tb_admin (username);

-- 索引：idx_admin_password
DROP INDEX IF EXISTS idx_admin_password;
CREATE INDEX IF NOT EXISTS idx_admin_password ON tb_admin (password);

-- 索引：idx_admin_create_time
DROP INDEX IF EXISTS idx_admin_create_time;
CREATE INDEX IF NOT EXISTS idx_admin_create_time ON tb_admin (create_time);

PRAGMA foreign_keys = on;

--
-- SQLiteStudio v3.4.17 生成的文件，周五 8月 8 00:28:56 2025
--
-- 所用的文本编码：UTF-8
--
PRAGMA foreign_keys = off;

-- tb_database_backup
DROP TABLE IF EXISTS tb_database_backup;
CREATE TABLE IF NOT EXISTS "tb_database_backup" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT,
  "size" INTEGER,
  "path" TEXT,
  "md5" TEXT,
  "create_time" INTEGER
);

-- 索引：idx_tb_database_backup_name
CREATE INDEX IF NOT EXISTS idx_tb_database_backup_name ON tb_database_backup (name);

-- 索引：idx_tb_database_backup_size
CREATE INDEX IF NOT EXISTS idx_tb_database_backup_size ON tb_database_backup (size);

-- 索引：idx_tb_database_backup_path
CREATE INDEX IF NOT EXISTS idx_tb_database_backup_path ON tb_database_backup (path);

-- 索引：idx_tb_database_backup_md5
CREATE INDEX IF NOT EXISTS idx_tb_database_backup_md5 ON tb_database_backup (md5);

-- 索引：idx_tb_database_backup_create_time
CREATE INDEX IF NOT EXISTS idx_tb_database_backup_create_time ON tb_database_backup (create_time);

PRAGMA foreign_keys = on;