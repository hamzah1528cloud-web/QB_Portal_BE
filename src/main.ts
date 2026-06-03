import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ENVIRONMENT, FRONTEND_URL, PORT } from './common/config/secrets';
import { AppLoggerService } from './common/logger/logger.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new AppLoggerService();

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: FRONTEND_URL.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.use(helmet());

  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (ENVIRONMENT !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('QB Portal API')
      .setDescription('QuickBooks Customer Ordering Portal — API documentation')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log('Swagger docs available at /api');
  }

  await app.listen(PORT);
  logger.log(`QB Portal BE running on http://localhost:${PORT} [${ENVIRONMENT}]`);
}

bootstrap();
