import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseTransformInterceptor } from "./common/interceptors/response-transform.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix keeps all backend APIs under `/api`.
  // This is useful when the frontend and nginx need a predictable path.
  app.setGlobalPrefix("api");

  // Browser-side form submissions from the Next.js app need CORS enabled.
  // We scope it to local frontend origins so development stays predictable.
  app.enableCors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  });

  // ValidationPipe lets DTO classes guard request shapes consistently.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
}

bootstrap();
