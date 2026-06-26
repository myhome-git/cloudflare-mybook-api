import { getType, isValidValue, ObjectType } from './utils/utils.js';
// 导出一个函数，用于过滤有效用户
export function filterValidToken(c) {
    let userTokens = c.env.USER_TOKENS;
    if (getType(userTokens) !== ObjectType.String) {
        return false;
    }
    const userToken = getRequestHeaders(c)["token"];
    if (!isValidValue(userToken) || userTokens !== userToken) {
        return false;
    }
    return true;
}

function getRequestHeaders(c) {
    return c.req.header();
}