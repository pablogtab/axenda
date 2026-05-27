import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface'
import { CustomFieldsService } from './custom-fields.service'
import {
  CreateClientFieldDefinitionDto,
  CreateClientFieldListDto,
  CreateClientFieldListOptionDto,
  UpdateClientFieldDefinitionDto,
  UpdateClientFieldListDto,
  UpdateClientFieldListOptionDto,
} from './dto/custom-field.dto'

@ApiTags('Custom Fields')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get('definitions')
  @ApiOperation({ summary: 'Listar definiciones de campos personalizados del tenant' })
  getDefinitions(@CurrentUser() user: AuthenticatedUser) {
    return this.customFieldsService.getDefinitions(user.tenantId)
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Crear definición de campo personalizado (máximo 4)' })
  createDefinition(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClientFieldDefinitionDto) {
    return this.customFieldsService.createDefinition(user.tenantId, dto)
  }

  @Patch('definitions/:id')
  @ApiOperation({ summary: 'Actualizar definición de campo personalizado' })
  updateDefinition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientFieldDefinitionDto,
  ) {
    return this.customFieldsService.updateDefinition(user.tenantId, id, dto)
  }

  @Delete('definitions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar definición de campo personalizado' })
  deleteDefinition(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.customFieldsService.deleteDefinition(user.tenantId, id)
  }

  @Get('lists')
  @ApiOperation({ summary: 'Listar listas personalizadas del tenant con opciones' })
  getLists(@CurrentUser() user: AuthenticatedUser) {
    return this.customFieldsService.getLists(user.tenantId)
  }

  @Post('lists')
  @ApiOperation({ summary: 'Crear lista personalizada' })
  createList(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClientFieldListDto) {
    return this.customFieldsService.createList(user.tenantId, dto)
  }

  @Patch('lists/:id')
  @ApiOperation({ summary: 'Actualizar lista personalizada' })
  updateList(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientFieldListDto,
  ) {
    return this.customFieldsService.updateList(user.tenantId, id, dto)
  }

  @Delete('lists/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar lista personalizada' })
  deleteList(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.customFieldsService.deleteList(user.tenantId, id)
  }

  @Post('lists/:id/options')
  @ApiOperation({ summary: 'Agregar opción a una lista' })
  addOption(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateClientFieldListOptionDto,
  ) {
    return this.customFieldsService.addOption(user.tenantId, id, dto)
  }

  @Patch('lists/:id/options/:optId')
  @ApiOperation({ summary: 'Editar opción de lista' })
  updateOption(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('optId') optId: string,
    @Body() dto: UpdateClientFieldListOptionDto,
  ) {
    return this.customFieldsService.updateOption(user.tenantId, id, optId, dto)
  }

  @Delete('lists/:id/options/:optId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar opción de lista' })
  deleteOption(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('optId') optId: string) {
    return this.customFieldsService.deleteOption(user.tenantId, id, optId)
  }
}
