import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto } from "@ai-kb/shared";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
