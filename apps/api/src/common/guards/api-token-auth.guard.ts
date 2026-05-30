import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTokensService, VerifiedToken } from '../../api-tokens/api-tokens.service';

/**
 * Authenticates requests via `Authorization: Bearer trc_*`. Attaches the
 * verified token + user to `request.user` so downstream handlers and the
 * @CurrentUser decorator can read it. Use on MCP endpoints and any other
 * API-token-gated route.
 *
 * Routes using this guard MUST also be marked @Public() so the global
 * JwtAuthGuard does not interfere.
 */
@Injectable()
export class ApiTokenAuthGuard implements CanActivate {
  constructor(private readonly tokensService: ApiTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
      user?: { sub: string; tokenId: string; scopes: string[] };
    }>();

    const header = request.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    if (!value || !value.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('MISSING_BEARER_TOKEN');
    }
    const raw = value.slice(7).trim();

    let verified: VerifiedToken | null;
    try {
      verified = await this.tokensService.verify(raw, request.ip);
    } catch {
      throw new UnauthorizedException('TOKEN_VERIFICATION_FAILED');
    }
    if (!verified) throw new UnauthorizedException('INVALID_TOKEN');

    request.user = {
      sub: verified.userId,
      tokenId: verified.tokenId,
      scopes: verified.scopes,
    };
    return true;
  }
}
