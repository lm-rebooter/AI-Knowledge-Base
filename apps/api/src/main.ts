/**
NestJS 应用入口文件

【项目定位】
这是整个主后端服务的启动入口，负责：
1. 创建 NestJS 应用实例
2. 配置全局中间件和管道
3. 监听指定端口

【为什么选择 NestJS？】
1. 装饰器语法让代码更清晰
2. 模块化架构易于扩展
3. 内置依赖注入
4. 与 TypeScript 深度集成
5. 丰富的生态系统（Prisma、Passport、JWT 等）
*/
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseTransformInterceptor } from "./common/interceptors/response-transform.interceptor";

async function bootstrap() {
  // 【Step 1】创建应用实例
  const app = await NestFactory.create(AppModule);

  // 【Step 2】配置全局前缀
  // 所有 API 路由都会加上 /api 前缀
  // 例如：/auth/login → /api/auth/login
  // 这样便于前端代理配置和 nginx 路由规则
  app.setGlobalPrefix("api");

  // 【Step 3】配置 CORS（跨域资源共享）
  // 因为前端运行在 localhost:3000，后端运行在 localhost:3001
  // 浏览器默认不允许跨域请求，需要显式开启
  //
  // 【生产环境建议】
  // - 指定具体的域名而非通配符
  // - 考虑使用 nginx 反向代理，避免 CORS 问题
  app.enableCors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true  // 允许携带 Cookie（用于 Session 认证）
  });

  // 【Step 4】配置全局验证管道
  // ValidationPipe 自动验证请求体的 DTO
  // - whitelist: 忽略没有添加验证装饰器的字段
  // - forbidNonWhitelisted: 拒绝包含未定义字段的请求
  // - transform: 自动转换类型（如 "123" → 123）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  // 【Step 5】注册全局异常过滤器
  // 统一处理未捕获的异常，返回格式化的错误响应
  app.useGlobalFilters(new HttpExceptionFilter());

  // 【Step 6】注册全局响应拦截器
  // 统一处理响应格式，如添加包装器 { data: ... }
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // 【Step 7】启动服务
  // 从环境变量读取端口，默认 3001
  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);

  console.log(`🚀 API 服务已启动: http://localhost:${port}/api`);
}

bootstrap();
