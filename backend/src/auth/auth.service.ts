import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import ImageKit from 'imagekit';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { courseAdmins, courseEnrollments, users } from '../database/schema';
import { fail, ok, ServiceResult } from '../common/types/service-result';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { formatAuthUser } from './cookie';

type AuthPayload = {
  message: string;
  accessToken: string;
  user: ReturnType<typeof formatAuthUser>;
};

@Injectable()
export class AuthService {
  private readonly imagekit: ImageKit;

  constructor(
    private readonly jwtService: JwtService,
    private readonly drizzle: DrizzleService,
  ) {
    this.imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
      urlEndpoint: process.env.IMAGEKIT_ENDPOINT || '',
    });
  }

  private get db() {
    return this.drizzle.db;
  }

  private signToken(userId: string, courseId: string | undefined, role: string) {
    return this.jwtService.sign({ userId, courseId, role });
  }

  private async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const rows = await this.db
      .select({ userId: courseEnrollments.userId })
      .from(courseEnrollments)
      .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId)))
      .limit(1);
    return rows.length > 0;
  }

  private async isAdminOfCourse(userId: string, courseId: string): Promise<boolean> {
    const rows = await this.db
      .select({ userId: courseAdmins.userId })
      .from(courseAdmins)
      .where(and(eq(courseAdmins.userId, userId), eq(courseAdmins.courseId, courseId)))
      .limit(1);
    return rows.length > 0;
  }

  private async verifyGoogleToken(idToken: string): Promise<ServiceResult<Record<string, any>>> {
    const googleVerifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
    const response = await fetch(googleVerifyUrl);
    const data = (await response.json()) as Record<string, any>;
    if (!response.ok) {
      return fail('unauthorized', 'Error connecting to Google');
    }
    if (data.error) {
      return fail('unauthorized', `${data.error}: ${data.error_description}`);
    }
    if (!data.email_verified) {
      return fail('unauthorized', 'Email not verified');
    }
    return ok(data);
  }

  async login(dto: LoginDto): Promise<ServiceResult<AuthPayload>> {
    const { email, password, courseId } = dto;
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return fail('unauthorized', 'Email not found');
    }
    if (!user.passwordHash && user.googleId) {
      return fail('unauthorized', 'Account registered with Google. Please use Google login');
    }
    const passwordMatch = await bcrypt.compare(password, user.passwordHash ?? '');
    if (!passwordMatch) {
      return fail(
        'unauthorized',
        user.googleId ? 'Wrong password. You can still use Google login.' : 'Wrong password',
      );
    }
    if (courseId && !(await this.isEnrolled(user.id, courseId))) {
      return fail('forbidden', 'User is not enrolled in the course');
    }
    const accessToken = this.signToken(user.id, courseId, user.role);
    return ok({
      message: 'Logged in successfully',
      accessToken,
      user: formatAuthUser(user),
    });
  }

  async register(dto: RegisterDto): Promise<ServiceResult<AuthPayload>> {
    const { userData, courseId } = dto;
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);
    if (existing.length > 0) {
      return fail('conflict', 'Email already exists');
    }
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(userData.password, 12);
    await this.db.transaction(async (tx) => {
      await tx.insert(users).values({
        id,
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username ?? null,
        pictureId: userData.pictureId ?? null,
        pictureUrl: userData.pictureURL ?? null,
        pictureThumbnail: userData.pictureThumbnail ?? null,
        role: 'student',
      });
      if (courseId) {
        await tx.insert(courseEnrollments).values({ userId: id, courseId });
      }
    });
    const accessToken = this.signToken(id, courseId, 'student');
    return ok({
      message: 'User created successfully',
      accessToken,
      user: {
        id,
        email: userData.email,
        role: 'student',
        firstName: userData.firstName,
        lastName: userData.lastName,
        pictureThumbnail: userData.pictureThumbnail ?? null,
        pictureUrl: userData.pictureURL ?? null,
        username: userData.username,
      },
    });
  }

  async googleLogin(dto: GoogleAuthDto): Promise<ServiceResult<AuthPayload>> {
    const verified = await this.verifyGoogleToken(dto.token);
    if (!verified.success) {
      return verified;
    }
    const data = verified.data;
    const [user] = await this.db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (!user) {
      return fail('unauthorized', 'User not found');
    }
    if (!user.googleId) {
      await this.db.update(users).set({ googleId: data.sub }).where(eq(users.email, data.email));
    }
    if (dto.courseId && !(await this.isEnrolled(user.id, dto.courseId))) {
      return fail('forbidden', 'User is not enrolled in this course');
    }
    const accessToken = this.signToken(user.id, dto.courseId, user.role);
    return ok({
      message: 'Logged in successfully',
      accessToken,
      user: formatAuthUser(user),
    });
  }

  async googleRegister(dto: GoogleAuthDto): Promise<ServiceResult<AuthPayload>> {
    const verified = await this.verifyGoogleToken(dto.token);
    if (!verified.success) {
      return verified;
    }
    const userData = verified.data;
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);
    if (existing.length > 0) {
      return fail('conflict', 'Email already exists');
    }
    const userId = uuidv4();
    await this.db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        googleId: userData.sub,
        email: userData.email,
        firstName: userData.given_name,
        lastName: userData.family_name,
        pictureUrl: userData.picture,
        pictureThumbnail: userData.picture,
        role: 'student',
      });
      if (dto.courseId) {
        await tx.insert(courseEnrollments).values({ userId, courseId: dto.courseId });
      }
    });
    const accessToken = this.signToken(userId, dto.courseId, 'student');
    return ok({
      message: 'User registered and logged in successfully',
      accessToken,
      user: formatAuthUser({
        id: userId,
        email: userData.email,
        role: 'student',
        firstName: userData.given_name,
        lastName: userData.family_name,
        pictureThumbnail: userData.picture,
        pictureUrl: userData.picture,
      }),
    });
  }

  async adminLogin(dto: LoginDto): Promise<ServiceResult<AuthPayload>> {
    const { email, password, courseId } = dto;
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.role !== 'admin') {
      return fail('unauthorized', 'Invalid credentials');
    }
    const passwordMatch = await bcrypt.compare(password, user.passwordHash ?? '');
    if (!passwordMatch) {
      return fail('unauthorized', 'Wrong password');
    }
    if (!courseId || !(await this.isAdminOfCourse(user.id, courseId))) {
      return fail('forbidden', 'User is not a course admin');
    }
    const accessToken = this.signToken(user.id, courseId, 'admin');
    return ok({
      message: 'Logged in successfully',
      accessToken,
      user: formatAuthUser(user),
    });
  }

  async adminGoogleLogin(dto: GoogleAuthDto): Promise<ServiceResult<AuthPayload>> {
    const verified = await this.verifyGoogleToken(dto.token);
    if (!verified.success) {
      return verified;
    }
    const data = verified.data;
    const [user] = await this.db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (!user || user.role !== 'admin') {
      return fail('unauthorized', 'User not found');
    }
    if (!dto.courseId || !(await this.isAdminOfCourse(user.id, dto.courseId))) {
      return fail('forbidden', 'User is not a course admin');
    }
    const accessToken = this.signToken(user.id, dto.courseId, 'admin');
    return ok({
      message: 'Logged in successfully',
      accessToken,
      user: formatAuthUser(user),
    });
  }

  getImagekitAuth() {
    return ok(this.imagekit.getAuthenticationParameters());
  }

  logout() {
    return ok({ message: 'Logged out successfully' });
  }
}
