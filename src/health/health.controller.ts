import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            // Database connectivity check
            () => this.db.pingCheck('database'),

            // Memory heap check (should not exceed 150MB)
            () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),

            // Memory RSS check (should not exceed 300MB)
            () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),

            // Disk storage check (should have at least 50% free space)
            () => this.disk.checkStorage('storage', {
                path: '/',
                thresholdPercent: 0.5
            }),
        ]);
    }

    @Get('ready')
    @HealthCheck()
    readiness() {
        // Readiness check - is the app ready to accept traffic?
        return this.health.check([
            () => this.db.pingCheck('database'),
        ]);
    }

    @Get('live')
    @HealthCheck()
    liveness() {
        // Liveness check - is the app alive?
        return this.health.check([
            () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
        ]);
    }
}
