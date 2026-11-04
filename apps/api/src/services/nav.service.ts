import { Injectable } from '@nestjs/common';
import { getSettings } from '../config/settings.config.js';
import { PriceData } from '../models/transaction.model.js';
import { singleflight, ttlCache } from '../utils/cache.util.js';

const SEC_API_CONFIG = {
  baseUrl: 'https://api.sec.or.th/v2/fund',
};

@Injectable()
export class NavService {
  private getHeaders(): Record<string, string> {
    const settings = getSettings();
    return {
      'Ocp-Apim-Subscription-Key': settings.secSubscriptionKey,
      Accept: 'application/json',
    };
  }

  async fetchFundNavs(symbols: string[]): Promise<Record<string, PriceData>> {
    const uniqueSymbols = Array.from(new Set(symbols));
    if (!uniqueSymbols.length) return {};

    const results = await Promise.all(
      uniqueSymbols.map((sym) => this.fetchSingleFundNav(sym)),
    );

    const priceMap: Record<string, PriceData> = {};
    for (const r of results) {
      if (
        r.data.price > 0 ||
        (r.data.name &&
          r.data.name !== r.originalSymbol &&
          r.data.name !== r.data.symbol)
      ) {
        priceMap[r.originalSymbol] = r.data;
      }
    }

    return priceMap;
  }

  async fetchPvdPolicies(projId?: string): Promise<Record<string, any>> {
    const settings = getSettings();
    const targetProjId = projId || settings.secPvdProjId;
    const cacheKey = `sec_pvd_policies_${targetProjId}`;
    const cached = ttlCache.get<Record<string, any>>(cacheKey);
    if (cached !== null) return cached;

    return singleflight.execute(`fetch_pvd_policies_${targetProjId}`, async () => {
      const c = ttlCache.get<Record<string, any>>(cacheKey);
      if (c !== null) return c;

      const url = `${settings.secPvdBaseUrl}/factsheet/${targetProjId}/policy`;
      try {
        const res = await fetch(url, { headers: this.getHeaders() });
        if (!res.ok) return {};
        const rawList = await res.json();
        if (!Array.isArray(rawList)) return {};

        const policyMap: Record<string, any> = {};
        for (const item of rawList) {
          const subId = item.sub_policy_id;
          if (subId) {
            const key = String(subId).trim().toUpperCase();
            policyMap[key] = {
              subPolicyId: subId,
              name: item.sub_policy_name || '',
              policyName: item.policy_name || '',
              aimcType: item.aimc_type || '',
              riskLevel: item.risk_level || '',
              objective: item.objective || '',
            };
          }
        }

        ttlCache.set(cacheKey, policyMap, 86400.0);
        return policyMap;
      } catch {
        return {};
      }
    });
  }

  async fetchSingleFundNav(
    symbol: string,
  ): Promise<{ originalSymbol: string; data: PriceData }> {
    const cacheKey = `sec_nav_single_${symbol}`;
    const cached = ttlCache.get<{ originalSymbol: string; data: PriceData }>(cacheKey);
    if (cached !== null) return cached;

    return singleflight.execute(`sec_nav_single_${symbol}`, async () => {
      const c = ttlCache.get<{ originalSymbol: string; data: PriceData }>(cacheKey);
      if (c !== null) return c;

      const cleanSymbol = symbol.replace(/\.(FUND|BKFUND)$/i, '').trim();
      const symUpper = cleanSymbol.toUpperCase();

      const profile = await this.fetchFundProfile(cleanSymbol, symUpper);
      if (!profile || !profile.proj_id) {
        return {
          originalSymbol: symbol,
          data: {
            symbol,
            name: cleanSymbol,
            price: 0.0,
            currency: 'THB',
          },
        };
      }

      const fund = {
        projId: profile.proj_id,
        name: profile.proj_name_en || profile.proj_name_th || cleanSymbol,
        targetClass: profile.fund_class_name,
      };

      const res = await this.fetchFundNavData(symbol, cleanSymbol, symUpper, fund);
      if (res.data.price > 0) {
        ttlCache.set(cacheKey, res, 1800.0);
      }
      return res;
    });
  }

  async fetchFundProfile(cleanSymbol: string, symUpper: string): Promise<any> {
    const cacheKey = `sec_profile_${cleanSymbol.toUpperCase()}`;
    const cached = ttlCache.get<any>(cacheKey);
    if (cached !== null) return cached;

    return singleflight.execute(`sec_profile_${cleanSymbol.toUpperCase()}`, async () => {
      const c = ttlCache.get<any>(cacheKey);
      if (c !== null) return c;

      try {
        const url1 = `${SEC_API_CONFIG.baseUrl}/general-info/profiles?fund_class_name=${encodeURIComponent(cleanSymbol)}`;
        const res1 = await fetch(url1, { headers: this.getHeaders() });
        let classItems: any[] = [];
        if (res1.ok && res1.status !== 204) {
          const data = await res1.json();
          classItems = data.items || [];
        }

        for (const i of classItems) {
          if (
            String(i.fund_class_name || '').toUpperCase() === symUpper ||
            String(i.proj_abbr_name || '').toUpperCase() === symUpper
          ) {
            ttlCache.set(cacheKey, i, 86400.0);
            return i;
          }
        }

        const url2 = `${SEC_API_CONFIG.baseUrl}/general-info/profiles?project_info=${encodeURIComponent(cleanSymbol)}`;
        const res2 = await fetch(url2, { headers: this.getHeaders() });
        let projItems: any[] = [];
        if (res2.ok && res2.status !== 204) {
          const data2 = await res2.json();
          projItems = data2.items || [];
        }

        if (!projItems.length) return null;

        let matched = projItems.find(
          (i) =>
            String(i.proj_abbr_name || '').toUpperCase() === symUpper &&
            i.fund_class_name === 'main',
        );
        if (!matched) {
          matched = projItems.find(
            (i) => String(i.fund_class_name || '').toUpperCase() === symUpper,
          );
        }
        if (!matched) {
          matched = projItems.find(
            (i) => String(i.proj_abbr_name || '').toUpperCase() === symUpper,
          );
        }
        if (!matched) {
          matched = projItems[0];
        }

        if (matched) {
          ttlCache.set(cacheKey, matched, 86400.0);
        }
        return matched;
      } catch {
        return null;
      }
    });
  }

  async fetchFundNavData(
    symbol: string,
    cleanSymbol: string,
    symUpper: string,
    fund: { projId: string; name: string; targetClass?: string },
  ): Promise<{ originalSymbol: string; data: PriceData }> {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);

    const fmtDate = (d: Date) => d.toISOString().split('T')[0];
    const url = `${SEC_API_CONFIG.baseUrl}/daily-info/nav?proj_id=${encodeURIComponent(fund.projId)}&start_nav_date=${fmtDate(start)}&end_nav_date=${fmtDate(end)}`;

    try {
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) {
        return {
          originalSymbol: symbol,
          data: { symbol, name: fund.name, price: 0.0, currency: 'THB' },
        };
      }
      const dataRaw = await res.json();
      const data: any[] = Array.isArray(dataRaw) ? dataRaw : dataRaw.items || [];

      if (!data.length) {
        return {
          originalSymbol: symbol,
          data: { symbol, name: fund.name, price: 0.0, currency: 'THB' },
        };
      }

      let filteredData = data.filter(
        (d) =>
          String(d.fund_class_name || '').toUpperCase() ===
          String(fund.targetClass || cleanSymbol).toUpperCase(),
      );

      if (!filteredData.length && fund.targetClass !== 'main') {
        filteredData = data.filter(
          (d) => String(d.fund_class_name || '').toUpperCase() === symUpper,
        );
      }
      if (!filteredData.length) {
        filteredData = data.filter((d) => d.fund_class_name === 'main');
      }
      if (!filteredData.length) {
        filteredData = data;
      }

      filteredData.sort((a, b) => b.nav_date.localeCompare(a.nav_date));
      const latest = filteredData[0];
      const nav = parseFloat(latest.last_val || 0);

      return {
        originalSymbol: symbol,
        data: {
          symbol,
          name: fund.name,
          price: isNaN(nav) ? 0.0 : nav,
          currency: 'THB',
        },
      };
    } catch {
      return {
        originalSymbol: symbol,
        data: { symbol, name: fund.name, price: 0.0, currency: 'THB' },
      };
    }
  }

  async fetchFundDividendHistory(symbol: string): Promise<any[]> {
    const cacheKey = `sec_div_${symbol}`;
    const cached = ttlCache.get<any[]>(cacheKey);
    if (cached !== null) return cached;

    return singleflight.execute(`sec_div_${symbol}`, async () => {
      const c = ttlCache.get<any[]>(cacheKey);
      if (c !== null) return c;

      const cleanSymbol = symbol.replace(/\.(FUND|BKFUND)$/i, '').trim();
      const symUpper = cleanSymbol.toUpperCase();

      try {
        const url1 = `${SEC_API_CONFIG.baseUrl}/daily-info/dividend-history?class_abbr_name=${encodeURIComponent(cleanSymbol)}`;
        const res1 = await fetch(url1, { headers: this.getHeaders() });
        if (res1.ok) {
          const json1 = await res1.json();
          const rawItems = json1.items || [];
          if (Array.isArray(rawItems) && rawItems.length) {
            ttlCache.set(cacheKey, rawItems, 3600.0);
            return rawItems;
          }
        }

        const profile = await this.fetchFundProfile(cleanSymbol, symUpper);
        if (profile && profile.proj_id) {
          const url2 = `${SEC_API_CONFIG.baseUrl}/daily-info/dividend-history?proj_id=${encodeURIComponent(profile.proj_id)}`;
          const res2 = await fetch(url2, { headers: this.getHeaders() });
          if (res2.ok) {
            const json2 = await res2.json();
            const rawItems2 = json2.items || [];
            if (Array.isArray(rawItems2) && rawItems2.length) {
              const filtered = rawItems2.filter(
                (i: any) =>
                  String(i.class_abbr_name || i.fund_class_name || '').toUpperCase() ===
                  symUpper,
              );
              const finalRes = filtered.length ? filtered : rawItems2;
              ttlCache.set(cacheKey, finalRes, 3600.0);
              return finalRes;
            }
          }
        }

        return [];
      } catch {
        return [];
      }
    });
  }

  async fetchAllFundDividends(symbols: string[]): Promise<Record<string, any[]>> {
    const uniqueSymbols = Array.from(new Set(symbols));
    if (!uniqueSymbols.length) return {};

    const results = await Promise.all(
      uniqueSymbols.map((sym) => this.fetchFundDividendHistory(sym)),
    );

    const map: Record<string, any[]> = {};
    for (let i = 0; i < uniqueSymbols.length; i++) {
      map[uniqueSymbols[i]] = results[i];
    }
    return map;
  }
}

