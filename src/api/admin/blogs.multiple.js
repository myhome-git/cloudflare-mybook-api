import { Hono } from 'hono';
import ClassDBConnection from '../../utils/db/ClassDBConnection.js';
import { conf_uuidName, conf_tableName, conf_tableColumns } from './blogs.multiple.config.js';

// 定义常量
const uuidName = conf_uuidName;
const tableName = conf_tableName;
const tableColumns = conf_tableColumns;

// 创建路由实例
const router = new Hono();

// 批量插入
router.post('/', async (c) => {
    const classDBConnection = new ClassDBConnection();
    classDBConnection.init(c.env);
    let sqlFields = tableColumns,sqlParams;
    try {
        const list = c.getValues();
        if (!Array.isArray(list) || list.length < 1) {
            return c.sendError({ message: "参数错误，必须是数组" });
        }
        for (const v of list) {
            // 获取参数values
            try {
                sqlParams = [v[uuidName]];
                sqlFields.forEach(item => {
                    sqlParams.push(v[item]);
                });
                const sqlValue = `
                    insert into ${tableName}
                        (${uuidName},${sqlFields.join(",")})
                    values
                        (?,${sqlFields.map(item => { return "?" }).join(",")})
                    `;
                await classDBConnection.query(sqlValue, sqlParams);
            } catch (error) {

            }
        }
        classDBConnection.close();
        return c.sendSuccess();
    } catch (error) {
        classDBConnection.close();
        return c.sendError(error);
    }
});

// 导出路由
export default router;
