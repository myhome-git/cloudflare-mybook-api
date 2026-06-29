--
-- SQLiteStudio v3.4.17 生成的文件，周日 6月 28 22:03:57 2026
--
-- 所用的文本编码：UTF-8
--
PRAGMA foreign_keys = off;
BEGIN TRANSACTION;

-- 表：tb_books
DROP TABLE IF EXISTS tb_books;

CREATE TABLE IF NOT EXISTS tb_books (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    author           TEXT,
    title            TEXT,
    folder           TEXT    UNIQUE,
    folder_index     TEXT    UNIQUE,
    total_chapters   INTEGER,
    total_word_count INTEGER,
    cover_url        TEXT,
    create_time      INTEGER,
    update_time      INTEGER
);


-- 索引：index_tb_books_author
DROP INDEX IF EXISTS index_tb_books_author;

CREATE INDEX IF NOT EXISTS index_tb_books_author ON tb_books (
    author
);


-- 索引：index_tb_books_title
DROP INDEX IF EXISTS index_tb_books_title;

CREATE INDEX IF NOT EXISTS index_tb_books_title ON tb_books (
    title
);


-- 索引：index_tb_books_folder
DROP INDEX IF EXISTS index_tb_books_folder;

CREATE INDEX IF NOT EXISTS index_tb_books_folder ON tb_books (
    folder
);


-- 索引：index_tb_books_folder_index
DROP INDEX IF EXISTS index_tb_books_folder_index;

CREATE INDEX IF NOT EXISTS index_tb_books_folder_index ON tb_books (
    folder_index
);


-- 索引：index_tb_books_cover_url
DROP INDEX IF EXISTS index_tb_books_cover_url;

CREATE INDEX IF NOT EXISTS index_tb_books_cover_url ON tb_books (
    cover_url
);


COMMIT TRANSACTION;
PRAGMA foreign_keys = on;
