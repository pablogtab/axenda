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
import { ClientsService } from './clients.service'
import { CreateClientDto, UpdateClientDto } from './dto/client.dto'
import { CreateClientTagDto } from './dto/client-tag.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'

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
  findAll(@CurrentUser() user: JwtPayload) {
    return this.clientsService.findAll(user.tenantId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el perfil de un cliente' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clientsService.findOne(user.tenantId, id)
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo cliente' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user.tenantId, dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar perfil del cliente' })
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(user.tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dar de baja a un cliente (soft delete)' })
  deactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.clientsService.deactivate(user.tenantId, id)
  }

  // ─── Tags ───────────────────────────────────────────────────────────────────

  @Post(':id/tags')
  @ApiOperation({ summary: 'Añadir un tag al cliente' })
  addTag(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateClientTagDto,
  ) {
    return this.clientsService.addTag(user.tenantId, id, dto)
  }

  @Delete(':id/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar un tag del cliente' })
  removeTag(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.clientsService.removeTag(user.tenantId, id, tagId)
  }
}
