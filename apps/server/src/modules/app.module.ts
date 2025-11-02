import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { InternalController } from './internal/internal.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TablesModule } from './tables/tables.module';
import { FieldsModule } from './fields/fields.module';
import { ViewsModule } from './views/views.module';
import { ProjectsModule } from './projects/projects.module';
import { RecordsModule } from './records/records.module';
import { QueryModule } from './query/query.module';
import { ExportModule } from './export/export.module';
import { ImportModule } from './import/import.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { HomeModule } from './home/home.module';
import { SpaceModule } from './space/space.module';
import { TasksModule } from './tasks/tasks.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TablesModule,
    FieldsModule,
    ViewsModule,
    ProjectsModule,
    RecordsModule,
    QueryModule,
    ExportModule,
    ImportModule,
    AttachmentsModule,
    HomeModule,
    SpaceModule,
    TasksModule,
    AdminModule,
  ],
  controllers: [HealthController, MetricsController, InternalController],
  providers: [],
})
export class AppModule {}