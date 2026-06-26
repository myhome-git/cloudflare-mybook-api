import { Hono } from 'hono';
import { cors } from 'hono/cors';
import SystemConfig from './SystemConfig.js';
import filterGateway from './filterGateway.js';

// 读取系统配置
const { corsSwitch } = SystemConfig;

// 应用开始
const app = new Hono();

// 如果开启了跨域，则使用cors中间件
if (corsSwitch) {
    app.use('*', cors({ origin: '*' }));
}

// 注册网关
await filterGateway(app);

// 导出应用
export default app
