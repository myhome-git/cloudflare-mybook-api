/**
 * Cloudflare Workers 免费额度：
 *     Workers：
 *          请求数 (Requests): 每天 100,000 个请求
 *     KV(数据据存储): 
 *          存储: 1 GB 的存储空间
 *          读取操作: 每月 100 万次读取操作
 *          写入操作: 每月 1000 次写入操作
 *          删除操作: 每月 1000 次删除操作
 *          列表操作: 每月 1000 次列表操作
 *     D1(数据库):
 *         数据库数量: 3 个数据库
 *         存储: 每个数据库 10 GB 的存储空间
 *         读取查询: 每月 5000 万次读取查询
 *         写入查询: 每月 500 万次写入查询
 *     R2
 *         存储空间: 10 GB
 *         A 类操作 (例如，put, copy, list): 每月 100 万次
 *         B 类操作 (例如，get, head): 每月 1000 万次
 */

const SystemConfigCF = {
    Worker: {
        request_max_count: 90000,
    },
    cloudflare_kv: {
        save_size: 1024 * 1024 * 1024 * 0.9, // 900MB
        read_max_count: 900000,
        write_max_count: 9000000,
        delete_max_count: 9000000,
        list_max_count: 9000000
    },
    cloudflare_d1: {
        database_max_count: 3,
        database_save_size: 1024 * 1024 * 1024 * 9, // 9GB
        read_max_count: 40000000,
        write_max_count: 4000000,
    },
    cloudflare_r2: {
        save_size: 9437184
    }
};
export default SystemConfigCF;