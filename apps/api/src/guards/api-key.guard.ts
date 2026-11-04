import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { getSettings } from '../config/settings.config.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Allow CORS preflight requests
    if (request.method === 'OPTIONS') {
      return true;
    }

    const path = request.path || '';
    if (path === '/' || path === '/health') {
      return true;
    }

    const apiKey =
      (request.headers['x-api-key'] as string) ||
      (request.headers['authorization'] as string)?.replace(/^Bearer\s+/i, '');

    const settings = getSettings();
    if (!settings.backendApiKey) {
      throw new UnauthorizedException({
        detail:
          'API Key authentication is unconfigured: BACKEND_API_KEY environment variable is missing.',
      });
    }

    if (!apiKey || apiKey !== settings.backendApiKey) {
      throw new UnauthorizedException({
        detail: 'Invalid or missing API Key',
      });
    }

    return true;
  }
}

