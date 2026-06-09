import { Controller, Get, Param } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { Public } from '../common/decorators/public.decorator'

@Public()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getAll() {
    return this.categoriesService.getAll()
  }

  @Get('tree')
  getTree() {
    return this.categoriesService.getTree()
  }

  @Get(':slug/attributes')
  getAttributes(@Param('slug') idOrSlug: string) {
    return this.categoriesService
      .getBySlug(idOrSlug)
      .then((c) => this.categoriesService.getAttributesForCategory(c.id))
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.categoriesService.getBySlug(slug)
  }
}
