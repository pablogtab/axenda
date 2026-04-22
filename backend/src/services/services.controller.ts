import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { ServicesService } from './services.service'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Services')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // ─── Categorías ─────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'Listar todas las categorías del tenant' })
  findAllCategories(@CurrentUser() user: JwtPayload) {
    return this.servicesService.findAllCategories(user.tenantId)
  }

  @Post('categories')
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.servicesService.createCategory(user.tenantId, dto)
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Actualizar una categoría existente' })
  updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.servicesService.updateCategory(user.tenantId, id, dto)
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar una categoría (soft delete)' })
  deactivateCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.servicesService.deactivateCategory(user.tenantId, id)
  }

  // ─── Servicios ──────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar todos los servicios del tenant' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.servicesService.findAll(user.tenantId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un servicio' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.servicesService.findOne(user.tenantId, id)
  }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo servicio' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(user.tenantId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un servicio existente' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un servicio (soft delete)' })
  deactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.servicesService.deactivate(user.tenantId, id)
  }
}
