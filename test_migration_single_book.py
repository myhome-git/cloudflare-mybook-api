#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
单本书迁移测试脚本
用于验证 MySQL 到 SQLite 迁移的核心逻辑
"""

import gzip
import hashlib
import json
import os
import sqlite3
from pathlib import Path


try:
    import pymysql
    from pymysql.cursors import SSDictCursor
except ImportError:
    print("错误：未找到 pymysql 库，请先安装：pip install pymysql")
    exit(1)


# 配置
MYSQL_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'root',
    'database': 'db_mybook',
    'cursorclass': SSDictCursor,
    'charset': 'utf8mb4'
}

OUTPUT_ROOT = Path(r"D:\mybook-disk")
OUTPUT_CHAPTERS_DIR = OUTPUT_ROOT / "chapters"


def generate_book_md5(author, title):
    """生成 book_md5 = MD5(作者名 + 小说名)"""
    # 确保字符串是 UTF-8 编码
    author_str = author if isinstance(author, str) else author.decode('utf-8') if author else ''
    title_str = title if isinstance(title, str) else title.decode('utf-8') if title else ''
    return hashlib.md5((author_str + title_str).encode('utf-8')).hexdigest()


def generate_chapter_md5(author, title, chapter_name):
    """生成 chapter_md5 = MD5(作者名 + 小说名 + 章节名)"""
    # 确保字符串是 UTF-8 编码
    author_str = author if isinstance(author, str) else author.decode('utf-8') if author else ''
    title_str = title if isinstance(title, str) else title.decode('utf-8') if title else ''
    chapter_str = chapter_name if isinstance(chapter_name, str) else chapter_name.decode('utf-8') if chapter_name else ''
    return hashlib.md5((author_str + title_str + chapter_str).encode('utf-8')).hexdigest()


def test_single_book(book_id=1):
    """测试单本书的迁移"""
    
    # 1. 从 tb_book_list 获取书籍信息
    print(f"\n{'='*70}")
    print(f"开始测试书籍 ID={book_id}")
    print('='*70)
    
    with pymysql.connect(**MYSQL_CONFIG) as conn:
        with conn.cursor(SSDictCursor) as cursor:
            cursor.execute("""
                SELECT id, bookTitle, bookAuthor, bookSectionTable, bookSectionCount, bookCoverImage, bookUpdateTime
                FROM tb_book_list 
                WHERE id = %s
            """, (book_id,))
            book = cursor.fetchone()
            
            if not book:
                print(f"书籍 ID={book_id} 不存在")
                return False
            
            book_id = book['id']
            book_title = book['bookTitle'] or ''
            book_author = book['bookAuthor'] or ''
            table_name = book['bookSectionTable']
            
            print(f"书籍信息:")
            print(f"  - ID: {book_id}")
            print(f"  - 书名：{book_title}")
            print(f"  - 作者：{book_author}")
            print(f"  - 分表：{table_name}")
            
            # 生成 book_md5
            book_md5 = generate_book_md5(book_author, book_title)
            print(f"  - book_md5: {book_md5}")
            
            # 2. 查询分表中的章节数据
            print(f"\n读取分表数据...")
            with pymysql.connect(**MYSQL_CONFIG) as conn2:
                with conn2.cursor(SSDictCursor) as cursor2:
                    query = f"""
                        SELECT id, bookId, bookTitle, bookSection, bookSectionContent 
                        FROM `{table_name}`
                        WHERE bookId = {book_id}
                        ORDER BY id
                    """
                    cursor2.execute(query)
                    chapters = cursor2.fetchall()
                    
                    print(f"找到 {len(chapters)} 个章节")
                    
                    # 3. 创建输出目录
                    book_dir = OUTPUT_CHAPTERS_DIR / book_md5
                    book_dir.mkdir(parents=True, exist_ok=True)
                    print(f"输出目录：{book_dir}")
                    
                    # 4. 保存 GZIP 文件（只处理有内容的章节）
                    chapter_index = []
                    skipped_count = 0
                    for i, chapter in enumerate(chapters, 1):
                        chapter_section = chapter.get('bookSection', '') or ''
                        content = chapter.get('bookSectionContent')
                        
                        # 如果内容为空，跳过
                        if content is None or content.strip() == '':
                            skipped_count += 1
                            print(f"  [{i}] {chapter_section[:30]}... (跳过：无内容)")
                            continue
                        
                        # 生成 chapter_md5
                        chapter_md5 = generate_chapter_md5(book_author, book_title, chapter_section)
                        
                        # 写入 GZIP 文件（实际文件名带 .txt.gz）
                        filepath = book_dir / f"{chapter_md5}.txt.gz"
                        with gzip.open(filepath, 'wt', encoding='utf-8', compresslevel=6) as f:
                            f.write(content)
                        
                        # index.json 中只存 MD5，不带 .txt.gz 后缀
                        chapter_index.append({
                            'chapter_name': chapter_section,
                            'file': chapter_md5,
                            'word_count': len(content)
                        })
                        
                        print(f"  [{i}] {chapter_section[:30]}... -> {filepath.name} ({len(content)} bytes)")
                    
                    print(f"\n过滤空内容：{skipped_count} 条")
                    
                    # 5. 计算总字数和章节数（使用实际生成的章节数）
                    total_word_count = sum(ch.get('word_count', 0) for ch in chapter_index)
                    actual_chapter_count = len(chapter_index)
                    
                    print(f"\n数据统计:")
                    print(f"  - MySQL bookSectionCount: {book.get('bookSectionCount')}")
                    print(f"  - 实际生成章节数：{actual_chapter_count}")
                    print(f"  - 过滤空内容：{len(chapters) - actual_chapter_count} 条")
                    
                    # 6. 写入 index.json（包含书籍信息和统计）
                    index_path = book_dir / "index.json"
                    index_data = {
                        'book_md5': book_md5,
                        'book_title': book_title,
                        'author': book_author,
                        'total_chapters': actual_chapter_count,
                        'total_word_count': total_word_count,
                        'chapters': chapter_index
                    }
                    with open(index_path, 'w', encoding='utf-8') as f:
                        json.dump(index_data, f, ensure_ascii=False, indent=2)
                    print(f"\n已写入 index.json: {index_path}")
                    
                    # 6. 创建 SQLite 记录（包含章节数、封面 URL、更新时间）
                    db_path = OUTPUT_ROOT / "test_books.db"
                    conn_sqlite = sqlite3.connect(str(db_path))
                    conn_sqlite.execute('PRAGMA journal_mode=WAL;')
                    conn_sqlite.execute('PRAGMA foreign_keys = ON;')
                    
                    create_sql = """
                        CREATE TABLE IF NOT EXISTS books (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            book_md5 TEXT NOT NULL UNIQUE,
                            author TEXT,
                            title TEXT,
                            chapter_count INTEGER DEFAULT 0,
                            cover_url TEXT,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    """
                    conn_sqlite.execute(create_sql)
                    
                    insert_sql = """
                        INSERT OR REPLACE INTO books (book_md5, author, title, chapter_count, cover_url, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """
                    conn_sqlite.execute(insert_sql, (
                        book_md5, 
                        book_author, 
                        book_title,
                        book.get('bookSectionCount', 0) or 0,
                        book.get('bookCoverImage'),
                        book.get('bookUpdateTime')
                    ))
                    conn_sqlite.commit()
                    conn_sqlite.close()
                    print(f"已写入 SQLite: {db_path}")
                    
                    # 7. 验证结果
                    print(f"\n{'='*70}")
                    print(f"验证结果:")
                    print('='*70)
                    
                    # 检查 GZIP 文件
                    gz_files = list(book_dir.glob("*.txt.gz"))
                    print(f"GZIP 文件数：{len(gz_files)} (预期：{len(chapters)})")
                    
                    # 检查 index.json
                    if index_path.exists():
                        with open(index_path, 'r', encoding='utf-8') as f:
                            idx = json.load(f)
                        print(f"index.json 章节数：{len(idx)} (预期：{len(chapters)})")
                        
                        # 验证第一个章节内容
                        if gz_files:
                            first_gz = gz_files[0]
                            with gzip.open(first_gz, 'rt', encoding='utf-8') as f:
                                content = f.read()
                            print(f"第一个章节内容预览:\n{content[:200]}...")
                    
                    # 检查 SQLite
                    conn_sqlite = sqlite3.connect(str(db_path))
                    cursor_sqlite = conn_sqlite.cursor()
                    cursor_sqlite.execute("SELECT * FROM books WHERE book_md5 = ?", (book_md5,))
                    record = cursor_sqlite.fetchone()
                    conn_sqlite.close()
                    
                    if record:
                        print(f"SQLite 记录存在:")
                        print(f"  - id: {record[0]}")
                        print(f"  - book_md5: {record[1]}")
                        print(f"  - author: {record[2]}")
                        print(f"  - title: {record[3]}")
                        print(f"  - chapter_count: {record[4]}")
                        print(f"  - cover_url: {record[5]}")
                        print(f"  - updated_at: {record[6]}")
                    else:
                        print("SQLite 记录不存在!")
                    
                    print(f"\n{'='*70}")
                    print(f"测试完成!")
                    print('='*70)
                    
                    return True


if __name__ == '__main__':
    import sys
    
    # 默认测试书籍 ID=1（斗罗大陆）
    book_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    
    success = test_single_book(book_id)
    exit(0 if success else 1)