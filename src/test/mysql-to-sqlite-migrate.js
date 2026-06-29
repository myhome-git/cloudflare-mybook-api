import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, stat } from 'fs';
import { rename } from 'fs/promises';
import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import crypto from 'crypto';
import { isValidValue } from '../utils/utils.js';
import { performance } from 'perf_hooks';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MySQL 到 SQLite 数据迁移脚本
 * 将 tb_book_list 表中的小说数据迁移到 SQLite 数据库的分表中
 */
class MysqlToSqliteMigration {
    constructor() {
        this.mysqlConnection = null;
        this.sqliteDb = null;
        
        // 数据库配置
        this.mysqlConfig = {
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || 'root',
            database: process.env.MYSQL_DATABASE || 'db_mybook'
        };
        
        this.sqlitePath = process.env.SQLITE_PATH || join(__dirname, '../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/bde76e6898f3690928a64ba7d2b2f4f401890171ab6ae6b30971b12661b4b718.sqlite');
    }

    /**
     * MD5 哈希函数
     */
    md5(message) {
        return crypto.createHash('md5').update(message).digest('hex');
    }

    /**
     * 连接 MySQL 数据库
     */
    async connectMysql() {
        try {
            console.log(`正在连接 MySQL 数据库：${this.mysqlConfig.host}/${this.mysqlConfig.database}...`);
            this.mysqlConnection = await mysql.createConnection({
                host: this.mysqlConfig.host,
                user: this.mysqlConfig.user,
                password: this.mysqlConfig.password,
                database: this.mysqlConfig.database
            });
            console.log('MySQL 数据库连接成功！');
            return true;
        } catch (error) {
            console.error('MySQL 数据库连接失败:', error.message);
            throw error;
        }
    }

    /**
     * 连接 SQLite 数据库
     */
    async connectSqlite() {
        return new Promise((resolve, reject) => {
            try {
                console.log(`正在连接 SQLite 数据库：${this.sqlitePath}...`);
                this.sqliteDb = new sqlite3.Database(this.sqlitePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                    if (err) {
                        console.error('SQLite 数据库连接失败:', err.message);
                        reject(err);
                    } else {
                        console.log('SQLite 数据库连接成功！');
                        resolve(true);
                    }
                });
            } catch (error) {
                console.error('SQLite 数据库连接异常:', error.message);
                reject(error);
            }
        });
    }

    /**
     * 检查并创建目标表（如果不存在）
     */
    async ensureTableExists(tableName) {
        return new Promise((resolve, reject) => {
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS ${tableName} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    author TEXT,
                    title TEXT,
                    folder TEXT UNIQUE,
                    folder_index TEXT,
                    total_chapters INTEGER,
                    total_word_count INTEGER,
                    cover_url TEXT,
                    create_time INTEGER,
                    update_time INTEGER
                )
            `;
            
            this.sqliteDb.run(createTableSql, (err) => {
                if (err) {
                    console.error(`创建表 ${tableName} 失败:`, err.message);
                    reject(err);
                } else {
                    // console.log(`表 ${tableName} 已存在或创建成功`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * 检查书籍是否已存在（通过 folder）
     */
    async isBookExists(folder) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.get('SELECT id FROM tb_books WHERE folder = ?', [folder], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row !== undefined && row !== null);
                }
            });
        });
    }

    /**
     *  检查书籍索引是否存在（通过 folder_index）
     */
    async isBookIndexExists(folder_index) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.get('SELECT id FROM tb_books WHERE folder_index = ?', [folder_index], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row !== undefined && row !== null);
                }
            });
        });
    }

    /**
     * 插入单本小说数据到 SQLite
     */
    insertBookToSqlite(row) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO tb_books 
                (author, title, folder, folder_index, total_chapters, total_word_count, cover_url, create_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                row.author,
                row.title,
                row.folder,
                row.folder_index,
                row.total_chapters,
                row.total_word_count,
                row.cover_url,
                Date.now()
            ];
        
            this.sqliteDb.run(sql, params, function(err) {
                if (err) {
                    // 如果是唯一约束错误，说明书籍已存在
                    if (err.message.includes('UNIQUE constraint failed')) {
                        console.warn(`书籍 ${row.title} 已存在，跳过`);
                        resolve({ success: false, exists: true });
                    } else {
                        console.error(`插入书籍 ${row.title} 失败:`, err.message);
                        reject(err);
                    }
                } else {
                    console.log(`✓ 成功插入书籍：${row.title}`);
                    resolve({ success: true, lastInsertId: this.lastID });
                }
            });
        });
    }

    /**
     * 批量插入数据（使用事务）
     */
    batchInsertBooks(books) {
        return new Promise((resolve, reject) => {
            try {
                // 开启事务
                this.sqliteDb.serialize(() => {
                    this.sqliteDb.run('BEGIN TRANSACTION');
                    
                    let successCount = 0;
                    let skipCount = 0;
                    let errorCount = 0;
                    let currentIndex = 0;
                    
                    const processNextBook = () => {
                        if (currentIndex >= books.length) {
                            // 所有书籍处理完毕，提交事务
                            this.sqliteDb.run('COMMIT', (err) => {
                                if (err) {
                                    console.error('事务提交失败:', err.message);
                                    this.sqliteDb.run('ROLLBACK');
                                    reject(err);
                                } else {
                                    console.log('\n=== 批量插入完成 ===');
                                    console.log(`成功：${successCount} 本`);
                                    console.log(`跳过（已存在）: ${skipCount} 本`);
                                    console.log(`失败：${errorCount} 本`);
                                    resolve({ success: true, successCount, skipCount, errorCount });
                                }
                            });
                            return;
                        }
                        
                        const row = books[currentIndex];
                        currentIndex++;
                        
                        this.ensureTableExists(`tb_books`)
                            .then(() => this.insertBookToSqlite(row))
                            .then(result => {
                                if (result.exists) {
                                    skipCount++;
                                } else {
                                    successCount++;
                                }
                                processNextBook();
                            })
                            .catch(error => {
                                errorCount++;
                                console.error(`处理书籍 ${row.bookTitle} 时出错:`, error.message);
                                processNextBook();
                            });
                    };
                    
                    processNextBook();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 打印内存使用信息
     */
    printMemoryUsage(prefix = '') {
        const usage = process.memoryUsage();
        console.log(`${prefix}内存使用 (MB):`);
        console.log(`  - heapTotal: ${(usage.heapTotal / 1024 / 1024).toFixed(2)}`);
        console.log(`  - heapUsed: ${(usage.heapUsed / 1024 / 1024).toFixed(2)}`);
        console.log(`  - external: ${(usage.external / 1024 / 1024).toFixed(2)}`);
    }

    /**
     * 执行迁移
     */
    async migrate() {
        try {
            console.log('\n========== 开始 MySQL 到 SQLite 数据迁移 ==========');
            
            // 初始内存监控
            this.printMemoryUsage('【初始】');
            const startTime = performance.now();
            
            // 连接 MySQL
            await this.connectMysql();
            this.printMemoryUsage('【MySQL 连接后】');
            
            // 连接 SQLite
            await this.connectSqlite();
            this.printMemoryUsage('【SQLite 连接后】');
            
            // 读取 MySQL 中的小说列表
            console.log('\n正在读取 MySQL 中的小说列表...');
            this.printMemoryUsage('【查询前】');
            const [rows] = await this.mysqlConnection.execute(
                'SELECT * FROM tb_book_list ORDER BY id ASC'
            );
            this.printMemoryUsage('【查询后】');
            
            console.log(`共找到 ${rows.length} 本小说`);
            
            if (rows.length === 0) {
                console.log('没有找到任何小说数据，迁移结束。');
                await this.close();
                return;
            }
            
            // 准备要插入的数据
            const booksToInsert = [];
            for (const row of rows) {
                const folder = await this.md5(`${row.bookAuthor}${row.bookTitle}`);
                const folderIndexMd5 = await this.md5(`${row.bookAuthor}${row.bookTitle}index`);
                const folderIndexMd5Old = await this.md5(`${row.bookAuthor}${row.bookTitle}index.json`);
                booksToInsert.push({
                    id: row.id,
                    author: row.bookAuthor,
                    title: row.bookTitle,
                    folder: folder,
                    folder_index: folderIndexMd5,
                    folder_index_old: folderIndexMd5Old,
                    total_chapters: row.bookSectionCount,
                    total_word_count: 0,
                    cover_url: row.bookCoverImage,
                    bookSectionTable: row.bookSectionTable,
                    create_time: Date.now()
                });
            }
            this.printMemoryUsage('【构建 booksToInsert 后】');
            
            // 批量插入
            await this.batchInsertBooks(booksToInsert);
            this.printMemoryUsage('【批量插入后】');

            // 批量修正数据库folder_index（使用事务大幅提升速度）
            // console.log('\n【批量更新】开始更新 folder_index...');
            // await new Promise((resolve, reject) => {
            //     this.sqliteDb.serialize(() => {
            //         this.sqliteDb.run('BEGIN TRANSACTION');
                    
            //         let updatedCount = 0;
            //         let currentIndex = 0;
                    
            //         const processNext = () => {
            //             if (currentIndex >= booksToInsert.length) {
            //                 this.sqliteDb.run('COMMIT', (err) => {
            //                     if (err) {
            //                         console.error('事务提交失败:', err.message);
            //                         this.sqliteDb.run('ROLLBACK');
            //                         reject(err);
            //                     } else {
            //                         console.log(`【批量更新】成功更新 ${updatedCount} 条记录`);
            //                         resolve();
            //                     }
            //                 });
            //                 return;
            //             }
                        
            //             const row = booksToInsert[currentIndex];
            //             currentIndex++;
                        
            //             this.sqliteDb.run(
            //                 `UPDATE tb_books SET folder_index = ? WHERE folder = ?`,
            //                 [row.folder_index, row.folder],
            //                 function(err) {
            //                     if (err) {
            //                         console.error(`更新失败 (id=${row.folder}):`, err.message);
            //                         console.error(`SQL: UPDATE tb_books SET folder_index = ${row.folder_index} WHERE folder = ${row.folder}`);
            //                         console.error(JSON.stringify(row, null, 2));
            //                     } else {
            //                         updatedCount++;
            //                     }
            //                     // 立即处理下一条，不等待结果
            //                     processNext();
            //                 }
            //             );
            //         };
                    
            //         // 启动第一批并发处理（同时处理多条，提升速度）
            //         const concurrency = 10;
            //         for (let i = 0; i < concurrency; i++) {
            //             processNext();
            //         }
            //     });
            // });
            
            /**
             * 文件存储逻辑每本书籍生成一个文件夹，文件名规则为MD5(author + title)，文件夹内包含：
             * 1. 一个包含小说章节内容的JSON文件，文件名为index.json，JSON示例格式：
             * {
                    "author": "唐家三少",
                    "title": "斗罗大陆",
                    "folder": "7882a802db52121a626794f39112e87b",
                    "folder_index": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
                    "total_chapters": 608,
                    "total_word_count": 4095754,
                    "chapters": [{
                        "title": "第一章 斗罗大陆",
                        "word_count": 6789,
                        "file": "e4f3c2b1a0d9e8f7c6b5a4d3e2f1g0h9",
                    }]
                }
             * 2. 每个章节内容单独存储为一个压缩后文本文件，文件名为章节内容的MD5值，内容为章节正文。
             * 3. 文件夹结构示例：
             *    - 7882a802db52121a626794f39112e87b/
             *      - index.json
             *     - e4f3c2b1a0d9e8f7c6b5a4d3e2f1g0h9.txt.gz
             */

            const folderPath = "d:\\backup-file\\mybook-disk\\chapters";
            let rowIndex = 0;
            this.printMemoryUsage('【开始处理书籍前】');
            for (const book of booksToInsert) {
                rowIndex++;
                const row = book;
                
                // 每本书开始时打印内存状态
                if (rowIndex % 5 === 1) {
                    this.printMemoryUsage(`【第${rowIndex}本书开始时】`);
                }

                // 创建书籍专属文件夹
                const bookFolder = join(folderPath, row.folder);
                mkdirSync(bookFolder, { recursive: true });

                // 如果发现旧的索引文件存在，则重命名索引文件，避免冲突
                const oldIndexFilePath = join(bookFolder, row.folder_index_old);
                // 尝试重命名旧索引文件（如果存在）
                try {
                    await rename(oldIndexFilePath, join(bookFolder, row.folder_index));
                    console.log(`已重命名旧索引文件并更新数据库: ${oldIndexFilePath} -> ${join(bookFolder, row.folder_index)}`);
                } catch (err) {
                    // 旧索引文件不存在（ENOENT）是正常情况，静默跳过
                    if (err.code !== 'ENOENT') {
                        console.warn(`⚠️ 重命名旧索引文件失败 (${oldIndexFilePath}): ${err.message}`);
                    }
                }

                // 判断目录中的索引文件是否存在，如果存在则跳过
                const indexFilePath = join(bookFolder, row.folder_index);
                try {
                    const indexFileStat = await promisify(stat)(indexFilePath);
                    console.log(`当前进度：${rowIndex}/${rows.length}，已跳过，书名：${row.title}，索引文件: ${indexFilePath}`);
                    continue;
                } catch (err) {
                    // 索引文件不存在，继续生成
                }

                // 先声明文件格式，索引文件JSON，包含作者、标题、章节总数等信息
                const indexContent = {
                    author: row.author,
                    title: row.title,
                    folder: row.folder,
                    folder_index: row.folder_index,
                    total_chapters: 0,
                    total_word_count: 0, // 假设每章平均1000字
                    chapters: [] // 章节信息将在后续填充
                };

                // 查询章节内容并写入文件，使用 gzip 压缩
                let chapters;
                try {
                    [chapters] = await this.mysqlConnection.execute(
                        `SELECT * FROM ${row.bookSectionTable} where bookId=${row.id} ORDER BY id ASC`
                    );
                } catch (error) {
                    // 如果表不存在或查询失败，跳过当前书籍
                    if (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146) {
                        console.warn(`⚠️  表 ${row.bookSectionTable} 不存在，跳过书籍：${row.title}`);
                        continue;
                    }
                    throw error;
                }
                
                // 写入每个章节
                for (const chapter of chapters) {
                    const chapterMd5 = this.md5(`${row.author}${row.title}${chapter.bookSection}` || '');
                    chapter.bookSectionCount = `${chapter.bookSectionContent ? chapter.bookSectionContent : ''}`.length || 0; // 确保章节字数存在
                    if(isValidValue(chapter.bookSectionContent)){
                        const chapterPath = join(bookFolder, `${chapterMd5}.txt.gz`);
                        
                        // 使用 piped stream 并确保正确关闭
                        await new Promise((resolve, reject) => {
                            const gzip = createGzip();
                            const chapterStream = createWriteStream(chapterPath);
                            
                            // 监听流的错误和完成事件
                            gzip.on('error', (err) => {
                                chapterStream.destroy();
                                reject(err);
                            });
                            
                            chapterStream.on('error', reject);
                            chapterStream.on('finish', () => {
                                // 确保两个流都关闭
                                gzip.destroy();
                                chapterStream.destroy();
                                resolve();
                            });
                            
                            // 管道传输数据
                            gzip.pipe(chapterStream);
                            
                            // 写入数据并结束 gzip 流
                            gzip.end(chapter.bookSectionContent || '');
                        });
                    }
                    indexContent.total_word_count = (indexContent.total_word_count || 0) + (chapter.bookSectionCount || 0);
                    indexContent.chapters.push({
                        title: chapter.bookSection,
                        word_count: chapter.bookSectionCount,
                        file: chapterMd5
                    });
                    
                    // 每处理完一个章节，强制触发垃圾回收（可选）
                    if (typeof global.gc === 'function') {
                        global.gc();
                    }
                }

                // 补充章节信息
                indexContent.total_chapters = chapters.length || 0;

                // 写入索引文件
                const indexPath = join(bookFolder, `${row.folder_index}`);
                await new Promise((resolve, reject) => {
                    const writeStream = createWriteStream(indexPath);
                    
                    // 监听流的错误和完成事件
                    writeStream.on('error', (err) => {
                        console.error(`写入索引文件失败：${indexPath}`, err.message);
                        reject(err);
                    });
                    
                    writeStream.on('finish', () => {
                        // 确保流正确关闭
                        writeStream.destroy();
                        resolve();
                        // 标记当前书籍的更新时间（使用 Promise 包装确保完成）
                        new Promise((resolveDb, rejectDb) => {
                            this.sqliteDb.run(
                                'UPDATE tb_books SET chapter_count = ?, update_time = ? WHERE folder = ?',
                                [chapters.length || 0, new Date(), row.folder],
                                function(err) {
                                    if (err) console.error('更新书籍信息失败:', err.message);
                                    resolveDb();
                                }
                            );
                        }).then(() => {
                            resolve();
                        }).catch(reject);
                    });
                    
                    // 写入 JSON 数据并结束流
                    writeStream.end(JSON.stringify(indexContent, null, 2));

                    // 清空章节内容以释放内存（index.json 不需要完整章节内容）
                    indexContent.chapters = [];

                });
                
                console.log(`当前进度：${rowIndex}/${rows.length}，书名：${row.title}，章节数：${chapters.length || 0}，索引文件：${indexPath}`);
                
                // 每处理完一本书，强制触发垃圾回收（可选）
                if (typeof global.gc === 'function') {
                    global.gc();
                }
            }

            console.log('\n========== 数据迁移完成 ==========');
            
            const endTime = performance.now();
            console.log(`\n总耗时：${((endTime - startTime) / 1000).toFixed(2)}秒`);
            this.printMemoryUsage('【最终】');
            
        } catch (error) {
            console.error('\n迁移过程中发生错误:', error);
            throw error;
        } finally {
            await this.close();
            this.printMemoryUsage('【关闭数据库后】');
        }
    }

    /**
     * 关闭数据库连接
     */
    async close() {
        try {
            if (this.mysqlConnection) {
                await this.mysqlConnection.end();
                console.log('MySQL 连接已关闭');
            }
            if (this.sqliteDb) {
                await promisify(this.sqliteDb.close).bind(this.sqliteDb)();
                console.log('SQLite 连接已关闭');
            }
        } catch (error) {
            console.error('关闭连接时出错:', error.message);
        }
    }
}

// 主程序入口
async function main() {
    const migration = new MysqlToSqliteMigration();
    
    try {
        await migration.migrate();
        console.log('\n迁移任务已成功完成！');
        process.exit(0);
    } catch (error) {
        console.error('\n迁移任务失败:', error.message);
        process.exit(1);
    }
}

// 支持命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MySQL 到 SQLite 数据迁移脚本

用法：node mysql-to-sqlite-migrate.js [选项]

选项:
  --help, -h      显示此帮助信息
  --test          测试模式，不实际执行迁移

环境变量:
  MYSQL_HOST          MySQL 主机地址 (默认：localhost)
  MYSQL_USER          MySQL 用户名 (默认：root)
  MYSQL_PASSWORD      MySQL 密码 (默认：root)
  MYSQL_DATABASE      MySQL 数据库名 (默认：mybook)
  SQLITE_PATH         SQLite 数据库文件路径 (默认：./database/db_sqlite_mybook.db)

示例:
  node mysql-to-sqlite-migrate.js
  MYSQL_HOST=192.168.1.100 node mysql-to-sqlite-migrate.js
`);
    process.exit(0);
}

// 运行主程序
main();