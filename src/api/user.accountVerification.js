import { Hono } from 'hono';
import SystemConfig from "../SystemConfig.js";
const { file_upload_max_size } = SystemConfig;
import { md5 } from "../utils/utils.js";
import ClassDBConnection from '../utils/db/ClassDBConnection.js';

// 定义常量
const uuidName = "api_token";
const tableName = "tb_admin";
const tableColumns = [
    "username", "password"
];

// 创建路由实例
const router = new Hono();

router.post('/accountVerification', async (c) => {
    const classDBConnection = new ClassDBConnection();
    classDBConnection.init(c.env);
    let sqlFields = [], sqlParams, sqlWhere = 'where 1=1', sqlSpace, sqlValue;
    try {
        // 查询是否存在
        sqlFields = ["username", "password"];
        const { username, password } = c.getValues();
        const hashedPassword = await md5(password);
        sqlParams = [username, hashedPassword];
        sqlFields.map((item) => { sqlWhere += ` and d.${item}=? ` });
        sqlParams = sqlParams.filter((item) => { return item != null });
        if (sqlParams.length < 2) {
            return c.sendError("参数缺失或不是有效参数");
        }
        sqlValue = `
            SELECT
                d.id,
                d.username,
                '${c.env.USER_TOKENS}' AS token,
                CAST(${file_upload_max_size} AS NUMERIC) AS file_upload_max_size
            FROM
                ${tableName} AS d
                ${sqlWhere}
            `;
        classDBConnection.open();
        let result = await classDBConnection.query(sqlValue, sqlParams);
        classDBConnection.close();
        if (result.length < 1) {
            return c.sendError("账户或密码不正确，验证失败");
        }
        return c.sendSuccess({ result: result[0] });
    } catch (error) {
        classDBConnection.close();
        return c.sendError(error);
    }
});

// 导出路由
export default router;
