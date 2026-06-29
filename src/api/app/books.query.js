import { Hono } from 'hono';
import ClassDBConnection from '@/utils/db/ClassDBConnection.js';
import { getType, isValidValue } from '@/utils/utils.js';
import { conf_uuidName, conf_tableName, conf_tableColumns } from '@/api/admin/books.config.js';

// 定义常量
const uuidName = conf_uuidName;
const tableName = conf_tableName;
const tableColumns = conf_tableColumns;

// 创建路由实例
const router = new Hono();

// 处理请求
router.get('/list', async (c) => {
    // 处理业务逻辑
    const classDBConnection = new ClassDBConnection();
    classDBConnection.init(c.env);
    let sqlFields = [], sqlParams = [], sqlWhere = 'where 1=1', sqlSpace, sqlValue;
    try {
        // 获取参数
        let { pageSize, pageRowNum, pageIndex } = c.getValuesPage();
        sqlFields = ["searchText"];
        sqlFields.map((item) => {
            const value = c.getValueById(item);
            if (isValidValue(value)) {
                if (item === "searchText") {
                    sqlWhere += ` and (d.author like ? or d.title like ?) `;
                    sqlParams.push(`%${value}%`);
                    sqlParams.push(`%${value}%`);
                } else {
                    sqlWhere += ` and d.${item}=? `;
                    sqlParams.push(value);
                }
            }
        });

        sqlValue = `
                    SELECT
                        ROW_NUMBER() OVER(ORDER BY id DESC) AS row_num,
                        d.*
                    FROM
                        ${tableName} AS d
                        ${sqlWhere} 
                    ORDER BY d.id desc LIMIT ? OFFSET ?
                    `;
        classDBConnection.open();
        let result = await classDBConnection.query(sqlValue, [...sqlParams, pageSize, pageRowNum]);

        // 获取分页信息
        const pageResult = await classDBConnection.query(`SELECT COUNT(d.${uuidName}) AS total FROM ${tableName} AS d ${sqlWhere}`, sqlParams);
        const page = {
            total: pageResult[0]["total"],
            pageSize: pageSize,
            pageIndex: pageIndex
        };
        classDBConnection.close();
        return c.sendSuccess({
            message: "success",
            result: result,
            page: page
        });

    } catch (error) {
        classDBConnection.close();
        return c.sendError(error);
    }
});
router.get('/detail', async (c) => {
    // 处理业务逻辑
    try {
        let result = { url: c.env.BOOKS_URL };
        return c.sendSuccess({
            message: "success",
            result: result
        });

    } catch (error) {
        return c.sendError(error);
    }
});

// 导出路由
export default router;
