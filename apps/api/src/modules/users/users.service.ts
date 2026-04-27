import { Injectable } from "@nestjs/common";

@Injectable()
export class UsersService {
  // In a real app this should use Prisma. A hard-coded seed user keeps the
  // starter easy to run before the database is fully wired.
  private readonly demoUsers = [
    {
      id: "user_demo_001",
      email: "demo@aikb.dev",
      name: "Demo User"
    }
  ];

  async findByEmail(email: string) {
    return this.demoUsers.find((user) => user.email === email) ?? null;
  }
}
