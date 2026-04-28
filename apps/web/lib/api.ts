/**
 * 前端 API 请求封装
 *
 * 【设计目的】
 * 统一管理所有对后端的 HTTP 请求，提供：
 * 1. 自动处理 JSON 序列化
 * 2. 统一的错误处理
 * 3. 未来可轻松切换到 React Query / SWR / Apollo Client
 *
 * 【使用示例】
 * ```typescript
 * // GET 请求
 * const users = await apiRequest<User[]>('/users');
 *
 * // POST 请求
 * const newUser = await apiRequest<User>('/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: '张三', email: 'zhangsan@example.com' })
 * });
 *
 * // 文件上传
 * const formData = new FormData();
 * formData.append('file', file);
 * formData.append('title', '我的文档');
 * await apiRequest('/documents/upload', {
 *   method: 'POST',
 *   body: formData
 * });
 * ```
 *
 * 【环境变量】
 * - NEXT_PUBLIC_API_URL: API 基础 URL（前端可以访问）
 *   开发环境: http://localhost:3001/api
 *   生产环境: https://api.example.com/api
 */

// 【配置】API 基础地址
// NEXT_PUBLIC_ 前缀表示这是客户端可访问的公开变量
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

/**
 * API 请求错误类
 *
 * 扩展 Error 类，添加 HTTP 状态码
 * 便于调用方根据错误类型做不同处理
 */
export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

/**
 * 通用的 API 请求函数
 *
 * 【类型参数 T】
 * 指定响应数据的类型，便于 TypeScript 类型推断
 *
 * 【参数】
 * - path: API 路径（不含基础 URL）
 * - init: 可选的 Fetch 请求配置
 *
 * 【自动处理】
 * - Content-Type: 自动根据请求体类型设置
 *   - FormData: 不设置（让浏览器自动处理）
 *   - 其他: application/json
 * - 错误处理: 非 2xx 状态码抛出 ApiRequestError
 *
 * 【返回】
 * 解析后的 JSON 数据，类型为 T
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // 检测是否为 FormData（用于文件上传）
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      // FormData 不需要手动设置 Content-Type
      // 浏览器会自动添加正确的 multipart/form-data 和边界
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      // 保留用户传入的 headers
      ...(init?.headers ?? {})
    }
  });

  // 【错误处理】
  // 状态码不在 200-299 范围内视为错误
  if (!response.ok) {
    throw new ApiRequestError(
      `API 请求失败: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  // 【响应解析】
  // 统一返回解析后的 JSON 数据
  return (await response.json()) as T;
}
