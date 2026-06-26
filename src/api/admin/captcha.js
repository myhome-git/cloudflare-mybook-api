import { Hono } from 'hono';
import { handleGet} from './captchaHandle.js';

// 创建路由实例
const router = new Hono();

// 处理请求
router.get('/', async (c) => {
    try {
        const result = await handleGet(c, classDBConnection);
        return c.sendSuccess(result);
    } catch (error) {
        // console.log(error);
        throw error;
    }
});

// 导出路由
export default router;
