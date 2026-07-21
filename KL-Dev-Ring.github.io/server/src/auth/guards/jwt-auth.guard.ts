// ── KL DevVerse — JWT Auth Guard ─────────────────────────────────────
// Protects routes that require authentication.

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
