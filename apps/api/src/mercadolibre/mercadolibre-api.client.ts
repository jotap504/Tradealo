import { Injectable, Logger } from '@nestjs/common';

export interface MlUser {
  id: number;
  nickname: string;
  site_id: string;
}

export interface MlPicture {
  id?: string;
  url: string;
  secure_url?: string;
  size?: string;
  max_size?: string;
}

export interface MlItem {
  id: string;
  title: string;
  price: number;
  currency_id: 'ARS' | 'USD' | string;
  condition: 'new' | 'used' | 'not_specified' | string;
  pictures: MlPicture[];
  category_id?: string;
  attributes?: { id: string; name: string; value_name?: string | null }[];
  permalink?: string;
  status?: string;
}

export interface MlItemDescription {
  text?: string;
  plain_text?: string;
}

export interface MlSearchPage {
  ids: string[];
  scrollId: string | null;
}

const ML_API = 'https://api.mercadolibre.com';

@Injectable()
export class MercadolibreApiClient {
  private readonly logger = new Logger(MercadolibreApiClient.name);

  async getMe(accessToken: string): Promise<MlUser> {
    return this.get<MlUser>('/users/me', accessToken);
  }

  async listUserItemIds(
    mlUserId: string,
    accessToken: string,
    scrollId?: string | null,
  ): Promise<MlSearchPage> {
    const params = new URLSearchParams({
      status: 'active',
      search_type: 'scan',
      limit: '100',
    });
    if (scrollId) params.set('scroll_id', scrollId);
    const path = `/users/${mlUserId}/items/search?${params.toString()}`;
    const json = await this.get<{
      results: string[];
      scroll_id?: string | null;
    }>(path, accessToken);
    return { ids: json.results ?? [], scrollId: json.scroll_id ?? null };
  }

  async getItemsBatch(ids: string[], accessToken: string): Promise<MlItem[]> {
    if (ids.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
    const out: MlItem[] = [];
    for (const chunk of chunks) {
      const path = `/items?ids=${chunk.join(',')}`;
      const json = await this.get<{ code: number; body: MlItem }[]>(
        path,
        accessToken,
      );
      for (const row of json) {
        if (row.code === 200 && row.body) out.push(row.body);
      }
    }
    return out;
  }

  async getItemDescription(id: string, accessToken: string): Promise<string> {
    try {
      const json = await this.get<MlItemDescription>(
        `/items/${id}/description`,
        accessToken,
      );
      return (json.plain_text ?? json.text ?? '').trim();
    } catch (err) {
      this.logger.warn(`No description for ${id}: ${(err as Error).message}`);
      return '';
    }
  }

  async exchangeCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id: number;
    scope?: string;
  }> {
    return this.postForm('/oauth/token', {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });
  }

  async refresh(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id: number;
    scope?: string;
  }> {
    return this.postForm('/oauth/token', {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
  }

  private async get<T>(path: string, accessToken: string): Promise<T> {
    const res = await fetch(`${ML_API}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`ML ${res.status} ${path}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  private async postForm<T>(
    path: string,
    body: Record<string, string>,
  ): Promise<T> {
    const params = new URLSearchParams(body);
    const res = await fetch(`${ML_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`ML ${res.status} ${path}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
}
