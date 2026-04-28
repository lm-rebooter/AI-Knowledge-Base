import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

function isFileTooLargeError(exception: unknown): exception is { code: string } {
  return (
    typeof exception === "object" &&
    exception !== null &&
    "code" in exception &&
    (exception as { code?: unknown }).code === "LIMIT_FILE_SIZE"
  );
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    const request = context.getRequest();

    const isFileTooLarge = isFileTooLargeError(exception);
    const status = isFileTooLarge
      ? HttpStatus.BAD_REQUEST
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isFileTooLarge
      ? "上传文件过大，请控制在 20MB 以内。"
      : exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      error: message,
      timestamp: new Date().toISOString()
    });
  }
}
