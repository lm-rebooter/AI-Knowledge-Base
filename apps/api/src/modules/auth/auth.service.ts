"""
认证服务 - 处理用户登录和 JWT 令牌

【JWT 认证流程】

1. 用户提交 email + password
2. 服务器验证凭证
3. 验证通过后，签发 JWT Token
4. 前端存储 Token，后续请求携带 Token
5. 服务器验证 Token 的有效性

【JWT Token 结构】

一个 JWT 由三部分组成，用点号分隔：
Header.Payload.Signature

例如：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3IxMjMiLCJlbWFpbCI6InVzZXJAdGVzdC5jb20ifQ.abc123

- Header: 包含算法信息（HS256）
- Payload: 包含声明（用户ID、过期时间等）
- Signature: 服务器签名，防止篡改

【安全注意事项】

⚠️ 当前实现是演示版本，存在以下安全风险：

1. 密码明文存储和比较
   当前直接比较 password !== "demo123456"
   生产环境必须使用 bcrypt 或 argon2 哈希

2. JWT Secret 简单
   生产环境需要使用强随机值，建议 32+ 字符

3. Token 有效期
   建议设置较短的过期时间（如 1 小时）
   并实现 Refresh Token 机制
"""
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "@ai-kb/shared";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    // UsersService: 查询用户数据
    private readonly usersService: UsersService,
    // JwtService: 签发和验证 JWT
    private readonly jwtService: JwtService
  ) {}

  /**
   * 用户登录
   *
   * 【流程】
   * 1. 根据 email 查找用户
   * 2. 验证密码（当前是简单比较，生产环境用 bcrypt）
   * 3. 签发 JWT Token
   * 4. 返回 Token 和用户信息
   */
  async login(payload: LoginDto) {
    // 【Step 1】查找用户
    const user = await this.usersService.findByEmail(payload.email);

    // 【Step 2】验证密码
    // ⚠️ 这里使用简单比较，仅用于演示
    // 生产环境必须：
    // 1. 密码哈希存储（bcrypt.hash）
    // 2. 密码验证（bcrypt.compare）
    if (!user || payload.password !== "demo123456") {
      throw new UnauthorizedException("邮箱或密码错误。");
    }

    // 【Step 3】签发 JWT Token
    // sub: subject，通常是用户 ID
    // email: 可以携带的用户信息，方便后续使用
    return {
      // JWT Token，前端需要存储并在后续请求中携带
      accessToken: this.jwtService.sign({
        sub: user.id,      // 用户 ID
        email: user.email  // 用户邮箱
      }),
      // 用户基本信息（不含密码）
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }
}
