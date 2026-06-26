#!/usr/bin/env python3
import pymysql

conn = pymysql.connect(
    host='localhost',
    port=3306,
    user='root',
    password='root',
    database='db_mybook',
    charset='utf8mb4'
)
cursor = conn.cursor()
cursor.execute("SHOW TABLES LIKE 'tb_book_section_%'")
tables = cursor.fetchall()
print(f'找到 {len(tables)} 个分表')
for t in tables[:5]:
    print(f'  - {t[0]}')
conn.close()