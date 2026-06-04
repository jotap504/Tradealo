import {
  Module, OnModuleInit, OnModuleDestroy, Inject, Logger,
} from '@nestjs/common'
import { Queue, Worker } from 'bullmq'
import type Redis from 'ioredis'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { REDIS_TOKEN } from '../redis/redis.module'
import { SearchService } from '../search/search.service'
import { NotificationsService } from '../notifications/notifications.service'
import { DRIZZLE_TOKEN } from '../database/database.module'
import { SearchModule } from '../search/search.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { ListingsModule } from '../listings/listings.module'
import { ListingsService } from '../listings/listings.service'
import { MercadolibreModule } from '../mercadolibre/mercadolibre.module'
import { MercadolibreApiClient } from '../mercadolibre/mercadolibre-api.client'
import { MercadolibreOauthService } from '../mercadolibre/mercadolibre-oauth.service'
import { MlImageService } from '../mercadolibre/ml-image.service'
import { MlAiDrafterService } from '../mercadolibre/ml-ai-drafter.service'
import * as schema from '../database/schema'
import { JobsService } from './jobs.service'
import {
  SEARCH_QUEUE, NOTIFICATION_QUEUE, LISTING_EXPIRY_QUEUE, ML_IMPORT_QUEUE,
  SEARCH_QUEUE_TOKEN, NOTIFICATION_QUEUE_TOKEN, LISTING_EXPIRY_QUEUE_TOKEN, ML_IMPORT_QUEUE_TOKEN,
} from './jobs.constants'
import { processSearchIndex } from './processors/search-index.processor'
import { processNotification } from './processors/notification.processor'
import { processListingExpiry } from './processors/listing-expiry.processor'
import { processMlImport } from './processors/ml-import.processor'

@Module({
  imports: [SearchModule, NotificationsModule, ListingsModule, MercadolibreModule],
  providers: [
    JobsService,
    {
      provide: SEARCH_QUEUE_TOKEN,
      inject: [REDIS_TOKEN],
      useFactory: (redis: Redis) =>
        new Queue(SEARCH_QUEUE, { connection: redis }),
    },
    {
      provide: NOTIFICATION_QUEUE_TOKEN,
      inject: [REDIS_TOKEN],
      useFactory: (redis: Redis) =>
        new Queue(NOTIFICATION_QUEUE, { connection: redis }),
    },
    {
      provide: LISTING_EXPIRY_QUEUE_TOKEN,
      inject: [REDIS_TOKEN],
      useFactory: (redis: Redis) =>
        new Queue(LISTING_EXPIRY_QUEUE, { connection: redis }),
    },
    {
      provide: ML_IMPORT_QUEUE_TOKEN,
      inject: [REDIS_TOKEN],
      useFactory: (redis: Redis) =>
        new Queue(ML_IMPORT_QUEUE, { connection: redis }),
    },
  ],
  exports: [JobsService],
})
export class JobsModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsModule.name)
  private workers: Worker[] = []

  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(DRIZZLE_TOKEN) private readonly db: NodePgDatabase<typeof schema>,
    @Inject(SEARCH_QUEUE_TOKEN) private readonly searchQueue: Queue,
    @Inject(LISTING_EXPIRY_QUEUE_TOKEN) private readonly expiryQueue: Queue,
    @Inject(ML_IMPORT_QUEUE_TOKEN) private readonly mlImportQueue: Queue,
    private readonly searchService: SearchService,
    private readonly notificationsService: NotificationsService,
    private readonly listingsService: ListingsService,
    private readonly mlOauth: MercadolibreOauthService,
    private readonly mlApi: MercadolibreApiClient,
    private readonly mlImage: MlImageService,
    private readonly mlDrafter: MlAiDrafterService,
  ) {}

  async onModuleInit(): Promise<void> {
    const connection = this.redis

    this.workers = [
      new Worker(
        SEARCH_QUEUE,
        (job) => processSearchIndex(job, this.searchService),
        { connection, concurrency: 5 },
      ),
      new Worker(
        NOTIFICATION_QUEUE,
        (job) => processNotification(job, this.notificationsService),
        { connection, concurrency: 3 },
      ),
      new Worker(
        LISTING_EXPIRY_QUEUE,
        (job) =>
          processListingExpiry(
            job,
            this.db as Parameters<typeof processListingExpiry>[1],
          ),
        { connection, concurrency: 1 },
      ),
      new Worker(
        ML_IMPORT_QUEUE,
        (job) =>
          processMlImport(job, {
            db: this.db,
            oauth: this.mlOauth,
            api: this.mlApi,
            imageService: this.mlImage,
            drafter: this.mlDrafter,
            listings: this.listingsService,
            notifications: this.notificationsService,
          }),
        { connection, concurrency: 2 },
      ),
    ]

    this.workers.forEach((w) => {
      w.on('failed', (job, err) => {
        this.logger.error(`Job failed [${job?.name}]`, err)
      })
    })

    await this.expiryQueue.add(
      'expire-listings',
      {},
      { repeat: { pattern: '0 2 * * *' }, jobId: 'listing-expiry-daily' },
    )

    this.logger.log('BullMQ workers started')
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()))
    await this.searchQueue.close()
    await this.expiryQueue.close()
    await this.mlImportQueue.close()
  }
}
