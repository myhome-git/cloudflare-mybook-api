import TestIndex from "./api/test/index.js";
import TestRequest from "./api/test/request.js";
import UserAccountVerification from "./api/user.accountVerification.js";
import Admin from "./api/admin/admin.js";
import AdminDatabase from "./api/admin/database.js";
import AdminPageWelcome from "./api/admin/pageWelcome.js";
import AppBooksQuery from "./api/app/books.query.js";
export const routerIndex = {
  "/api/test/index": TestIndex,
  "/api/test/request": TestRequest,
  "/api/user": UserAccountVerification,
  "/api/admin": Admin,
  "/api/admin/database": AdminDatabase,
  "/api/admin/welcome": AdminPageWelcome,
  "/api/app/books": AppBooksQuery,
};

// // 异步导入模块函数,暂时弃用
// async function importModule(childPath) {
//   // 拼接模块路径
//   const path = `${apiURL}${childPath}`;
//   try {
//     // 使用动态导入加载模块
//     const module = await import(path);
//     return module.default ?? module; // 兼容默认导出和命名导出^^^4^^
//   } catch (error) {
//     console.error(`模块加载失败: ${path}`, error);
//     throw new Error(`MODULE_LOAD_FAILED: ${path}`); // 标准化错误类型^^^3^^
//   }
// }

// export default router;
export default routerIndex;