import { Module } from '@nestjs/common'
import { Client } from '@elastic/elasticsearch'
import { SearchService } from './search.service'
import { SearchController } from './search.controller'
import { ELASTICSEARCH_TOKEN } from './search.constants'

export { ELASTICSEARCH_TOKEN }

@Module({
  providers: [
    {
      provide: ELASTICSEARCH_TOKEN,
      useFactory: () =>
        new Client({
          node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
          auth: process.env.ELASTICSEARCH_API_KEY
            ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
            : undefined,
        }),
    },
    SearchService,
  ],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
