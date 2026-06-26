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
-- SQLiteStudio v3.4.17 生成的文件，周五 8月 8 00:27:48 2025
--
-- 所用的文本编码：UTF-8
--
PRAGMA foreign_keys = off;

-- 表：tb_blog_class
DROP TABLE IF EXISTS tb_blog_class;
CREATE TABLE IF NOT EXISTS "tb_blog_class" (

  "id" INTEGER NOT NULL PRIMARY KEY,

  "name" TEXT,

  "sort" TEXT,

  "create_time" INTEGER

);

-- 索引：idx_blog_class_name
DROP INDEX IF EXISTS idx_blog_class_name;
CREATE INDEX IF NOT EXISTS idx_blog_class_name ON tb_blog_class (name);

-- 索引：idx_blog_class_sort
DROP INDEX IF EXISTS idx_blog_class_sort;
CREATE INDEX IF NOT EXISTS idx_blog_class_sort ON tb_blog_class (sort);

-- 索引：idx_blog_class_create_time
DROP INDEX IF EXISTS idx_blog_class_create_time;
CREATE INDEX IF NOT EXISTS idx_blog_class_create_time ON tb_blog_class (create_time);

PRAGMA foreign_keys = on;
--
-- SQLiteStudio v3.4.17 生成的文件，周五 8月 8 00:28:09 2025
--
-- 所用的文本编码：UTF-8
--
PRAGMA foreign_keys = off;

-- 表：tb_blogs
DROP TABLE IF EXISTS tb_blogs;
CREATE TABLE IF NOT EXISTS "tb_blogs" (

  "id" INTEGER NOT NULL PRIMARY KEY,

  "title" TEXT,

  "titleDecodeValue" TEXT,

  "tags" TEXT,

  "jianshu" TEXT,

  "content" TEXT,

  "classId" INTEGER,

  "key" TEXT,

  "readTop" TEXT,

  "readVisibility" TEXT,

  "readCount" INTEGER,

  "userId" INTEGER,

  "create_time" INTEGER,

  "update_time" INTEGER

);

-- 索引：idx_blogs_title
DROP INDEX IF EXISTS idx_blogs_title;
CREATE INDEX IF NOT EXISTS idx_blogs_title ON tb_blogs (title);

-- 索引：idx_blogs_titleDecodeValue
DROP INDEX IF EXISTS idx_blogs_titleDecodeValue;
CREATE INDEX IF NOT EXISTS idx_blogs_titleDecodeValue ON tb_blogs (titleDecodeValue);

-- 索引：idx_blogs_tags
DROP INDEX IF EXISTS idx_blogs_tags;
CREATE INDEX IF NOT EXISTS idx_blogs_tags ON tb_blogs (tags);

-- 索引：idx_blogs_jianshu
DROP INDEX IF EXISTS idx_blogs_jianshu;
CREATE INDEX IF NOT EXISTS idx_blogs_jianshu ON tb_blogs (jianshu);

-- 索引：idx_blogs_content
DROP INDEX IF EXISTS idx_blogs_content;
CREATE INDEX IF NOT EXISTS idx_blogs_content ON tb_blogs (content);

-- 索引：idx_blogs_classId
DROP INDEX IF EXISTS idx_blogs_classId;
CREATE INDEX IF NOT EXISTS idx_blogs_classId ON tb_blogs (classId);

-- 索引：idx_blogs_key
DROP INDEX IF EXISTS idx_blogs_key;
CREATE INDEX IF NOT EXISTS idx_blogs_key ON tb_blogs (key);

-- 索引：idx_blogs_readTop
DROP INDEX IF EXISTS idx_blogs_readTop;
CREATE INDEX IF NOT EXISTS idx_blogs_readTop ON tb_blogs (readTop);

-- 索引：idx_blogs_readVisibility
DROP INDEX IF EXISTS idx_blogs_readVisibility;
CREATE INDEX IF NOT EXISTS idx_blogs_readVisibility ON tb_blogs (readVisibility);

-- 索引：idx_blogs_readCount
DROP INDEX IF EXISTS idx_blogs_readCount;
CREATE INDEX IF NOT EXISTS idx_blogs_readCount ON tb_blogs (readCount);

-- 索引：idx_blogs_userId
DROP INDEX IF EXISTS idx_blogs_userId;
CREATE INDEX IF NOT EXISTS idx_blogs_userId ON tb_blogs (userId);

-- 索引：idx_blogs_create_time
DROP INDEX IF EXISTS idx_blogs_create_time;
CREATE INDEX IF NOT EXISTS idx_blogs_create_time ON tb_blogs (create_time);

-- 索引：idx_blogs_update_time
DROP INDEX IF EXISTS idx_blogs_update_time;
CREATE INDEX IF NOT EXISTS idx_blogs_update_time ON tb_blogs (update_time);

PRAGMA foreign_keys = on;
--
-- SQLiteStudio v3.4.17 生成的文件，周五 8月 8 00:28:27 2025
--
-- 所用的文本编码：UTF-8
--
PRAGMA foreign_keys = off;

-- 表：tb_friendly_link
DROP TABLE IF EXISTS tb_friendly_link;
CREATE TABLE IF NOT EXISTS "tb_friendly_link" (

  "id" INTEGER NOT NULL COLLATE BINARY PRIMARY KEY,

  "name" TEXT,

  "target" TEXT,

  "link_url" TEXT,

  "sort" INTEGER,

  "create_time" INTEGER

);

-- 索引：idx_friendly_link_name
DROP INDEX IF EXISTS idx_friendly_link_name;
CREATE INDEX IF NOT EXISTS idx_friendly_link_name ON tb_friendly_link (name);

-- 索引：idx_friendly_link_target
DROP INDEX IF EXISTS idx_friendly_link_target;
CREATE INDEX IF NOT EXISTS idx_friendly_link_target ON tb_friendly_link (target);

-- 索引：idx_friendly_link_link_url
DROP INDEX IF EXISTS idx_friendly_link_link_url;
CREATE INDEX IF NOT EXISTS idx_friendly_link_link_url ON tb_friendly_link (link_url);

-- 索引：idx_friendly_link_sort
DROP INDEX IF EXISTS idx_friendly_link_sort;
CREATE INDEX IF NOT EXISTS idx_friendly_link_sort ON tb_friendly_link (sort);

-- 索引：idx_friendly_link_create_time
DROP INDEX IF EXISTS idx_friendly_link_create_time;
CREATE INDEX IF NOT EXISTS idx_friendly_link_create_time ON tb_friendly_link (create_time);

PRAGMA foreign_keys = on;
--
-- SQLiteStudio v3.4.17 生成的文件，周五 8月 8 00:28:56 2025
--
-- 所用的文本编码：UTF-8
--
PRAGMA foreign_keys = off;

-- 表：tb_notepad
DROP TABLE IF EXISTS tb_notepad;
CREATE TABLE IF NOT EXISTS "tb_notepad" (

  "id" INTEGER NOT NULL PRIMARY KEY,

  "contentDecodeValue" TEXT,

  "content" TEXT,

  "key" TEXT,

  "userId" INTEGER,

  "create_time" INTEGER,

  "update_time" INTEGER

);

-- 索引：idx_notepad_contentDecodeValue
DROP INDEX IF EXISTS idx_notepad_contentDecodeValue;
CREATE INDEX IF NOT EXISTS idx_notepad_contentDecodeValue ON tb_notepad (contentDecodeValue);

-- 索引：idx_notepad_content
DROP INDEX IF EXISTS idx_notepad_content;
CREATE INDEX IF NOT EXISTS idx_notepad_content ON tb_notepad (content);

-- 索引：idx_notepad_key
DROP INDEX IF EXISTS idx_notepad_key;
CREATE INDEX IF NOT EXISTS idx_notepad_key ON tb_notepad (key);

-- 索引：idx_notepad_userId
DROP INDEX IF EXISTS idx_notepad_userId;
CREATE INDEX IF NOT EXISTS idx_notepad_userId ON tb_notepad (userId);

-- 索引：idx_notepad_create_time
DROP INDEX IF EXISTS idx_notepad_create_time;
CREATE INDEX IF NOT EXISTS idx_notepad_create_time ON tb_notepad (create_time);

-- 索引：idx_notepad_update_time
DROP INDEX IF EXISTS idx_notepad_update_time;
CREATE INDEX IF NOT EXISTS idx_notepad_update_time ON tb_notepad (update_time);

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