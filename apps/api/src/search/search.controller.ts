import { Controller, Get, Query } from '@nestjs/common'
import { SearchService } from './search.service'
import { SearchListingsDto } from './dto/search-listings.dto'
import { Public } from '../common/decorators/public.decorator'

@Public()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: SearchListingsDto) {
    return this.searchService.search(query)
  }
}
