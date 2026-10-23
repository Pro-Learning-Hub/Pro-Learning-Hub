import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { unwrapResult } from '../common/http/map-service-result';
import { clearAccessTokenCookie, setAccessTokenCookie } from './cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private writeSession(res: Response, payload: { accessToken: string }) {
    setAccessTokenCookie(res, payload.accessToken);
    return payload;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.writeSession(res, unwrapResult(await this.authService.login(dto)));
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.writeSession(res, unwrapResult(await this.authService.register(dto)));
  }

  @Public()
  @Post('oauth/google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: GoogleAuthDto, @Res({ passthrough: true }) res: Response) {
    return this.writeSession(res, unwrapResult(await this.authService.googleLogin(dto)));
  }

  @Public()
  @Post('oauth/googleRegister')
  @HttpCode(HttpStatus.CREATED)
  async googleRegister(@Body() dto: GoogleAuthDto, @Res({ passthrough: true }) res: Response) {
    return this.writeSession(res, unwrapResult(await this.authService.googleRegister(dto)));
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.writeSession(res, unwrapResult(await this.authService.adminLogin(dto)));
  }

  @Public()
  @Post('admin/oauth/google')
  @HttpCode(HttpStatus.OK)
  async adminGoogleLogin(@Body() dto: GoogleAuthDto, @Res({ passthrough: true }) res: Response) {
    return this.writeSession(res, unwrapResult(await this.authService.adminGoogleLogin(dto)));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    clearAccessTokenCookie(res);
    return unwrapResult(this.authService.logout());
  }

  @Public()
  @Get('imagekit')
  getImagekitAuth() {
    return unwrapResult(this.authService.getImagekitAuth());
  }
}
