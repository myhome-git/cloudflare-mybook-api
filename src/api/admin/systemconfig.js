import { Hono } from 'hono';
import { handleGet, handlePost} from './systemconfigHandle.js';

// 创建路由实例
const router = new Hono();

// 处理请求
router.get('/', async (c) => {
    try {
        const result = await handleGet(c);
        return c.sendSuccess(result);
    } catch (error) {
        // console.log(error);
        throw error;
    }
});
router.put('/', async (c) => {
    try {
        await handlePost(c);
        return c.sendSuccess();
    } catch (error) {
        return c.sendError(error);
    }
});

// 导出路由
export default router;
