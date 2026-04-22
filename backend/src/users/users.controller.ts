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
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateRoleDto } from './dto/update-role.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Own profile ────────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMe(user.sub)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar perfil propio (nombre, password)' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.sub, dto)
  }

  // ─── Tenant user management (ADMIN / MANAGER) ───────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Listar usuarios del tenant' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAll(user.tenantId)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.findOne(user.tenantId, id)
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo usuario en el tenant (ADMIN)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.tenantId, dto)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar datos de un usuario (ADMIN)' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user.tenantId, id, dto)
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar rol de un usuario (ADMIN)' })
  updateRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(user.tenantId, id, dto, user.sub)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar usuario (soft delete, ADMIN)' })
  deactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.deactivate(user.tenantId, id, user.sub)
  }
}
