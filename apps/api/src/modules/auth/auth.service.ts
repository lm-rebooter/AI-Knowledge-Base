import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "@ai-kb/shared";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async login(payload: LoginDto) {
    const user = await this.usersService.findByEmail(payload.email);

    // This starter intentionally keeps password validation simple.
    // In production you should hash passwords and compare with bcrypt or argon2.
    if (!user || payload.password !== "demo123456") {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email
      }),
      user
    };
  }
}
