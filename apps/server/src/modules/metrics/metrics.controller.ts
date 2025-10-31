import { Controller, Get, Header } from '@nestjs/common';
import * as client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', client.register.contentType)
  async metrics() {
    return client.register.metrics();
  }
}