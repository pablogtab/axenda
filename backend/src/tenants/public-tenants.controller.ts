import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { TenantsService } from './tenants.service'

@ApiTags('Public')
@Controller('p') // We'll keep 'p' for API internal prefix if needed, or just root
export class PublicTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('check-availability/:slug')
  @ApiOperation({ summary: 'Comprobar si un slug está disponible' })
  async checkAvailability(@Param('slug') slug: string) {
    const isAvailable = await this.tenantsService.isSlugAvailable(slug)
    return { available: isAvailable }
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener información pública del negocio por slug' })
  findBySlug(@Param('slug') slug: string, @Query('invitation') invitation?: string) {
    return this.tenantsService.findByPublicSlug(slug, invitation)
  }
}
