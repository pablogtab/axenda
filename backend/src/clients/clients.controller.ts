import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { ClientsService } from './clients.service'
import { CreateClientDto, SaveClientCustomFieldsDto, UpdateClientDto } from './dto/client.dto'
import { CreateClientTagDto } from './dto/client-tag.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface'

@ApiTags('Clients')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // ─── CRUD de Clientes ───────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar todos los clientes del tenant' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') query?: string,
    @Query('fieldId') fieldId?: string,
    @Query('fieldValue') fieldValue?: string,
  ) {
    return this.clientsService.findAll(
      user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      query,
      fieldId,
      fieldValue,
    )
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar clientes por nombre, email o teléfono' })
  search(@CurrentUser() user: AuthenticatedUser, @Query('q') query: string) {
    return this.clientsService.search(user.tenantId, query || '')
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el perfil de un cliente' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clientsService.findOne(user.tenantId, id)
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo cliente' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user.tenantId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar perfil del cliente' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dar de baja a un cliente (soft delete)' })
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clientsService.deactivate(user.tenantId, id)
  }

  // ─── Tags ───────────────────────────────────────────────────────────────────

  @Post(':id/tags')
  @ApiOperation({ summary: 'Añadir un tag al cliente' })
  addTag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateClientTagDto,
  ) {
    return this.clientsService.addTag(user.tenantId, id, dto)
  }

  @Delete(':id/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar un tag del cliente' })
  removeTag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.clientsService.removeTag(user.tenantId, id, tagId)
  }

  @Get(':id/custom-fields')
  @ApiOperation({ summary: 'Obtener definiciones y valores de campos personalizados del cliente' })
  getCustomFields(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clientsService.getCustomFields(user.tenantId, id)
  }

  @Put(':id/custom-fields')
  @ApiOperation({ summary: 'Guardar valores de campos personalizados del cliente' })
  saveCustomFields(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SaveClientCustomFieldsDto,
  ) {
    return this.clientsService.saveCustomFields(user.tenantId, id, dto)
  }
}
