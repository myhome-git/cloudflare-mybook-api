import TestIndex from "./api/test/index.js";
import TestRequest from "./api/test/request.js";
import UserAccountVerification from "./api/user.accountVerification.js";
import Admin from "./api/admin/admin.js";
import Blogs from "./api/admin/blogs.js";
import BlogsMultiple from "./api/admin/blogs.multiple.js";
import BlogsQuery from "./api/admin/blogs.query.js";
import BlogClass from "./api/admin/blogClass.js";
import Notepad from "./api/admin/notepad.js";
import Link from "./api/admin/link.js";
import AdminDatabase from "./api/admin/database.js";
import AdminPageWelcome from "./api/admin/pageWelcome.js";
import AppBlogsQuery from "./api/app/blogs.query.js";
import AppBlogClass from "./api/app/blogClass.js";
import AppPageMain from "./api/app/pageMain.js";
import AppPageBlogRead from "./api/app/pageBlogRead.js";
export const routerIndex = {
  "/api/test/index": TestIndex,
  "/api/test/request": TestRequest,
  "/api/user": UserAccountVerification,
  "/api/admin": Admin,
  "/api/admin/blogs": Blogs,
  "/api/admin/blogs/multiple": BlogsMultiple,
  "/api/admin/blogs/query": BlogsQuery,
  "/api/admin/blogClass": BlogClass,
  "/api/admin/notepad": Notepad,
  "/api/admin/link": Link,
  "/api/admin/database": AdminDatabase,
  "/api/admin/welcome": AdminPageWelcome,
  "/api/app/blogs/query": AppBlogsQuery,
  "/api/app/blogClass": AppBlogClass,
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