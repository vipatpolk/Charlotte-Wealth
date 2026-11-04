import { When, Then, Before, After, DataTable } from '@cucumber/cucumber';
import { request, APIRequestContext, APIResponse, expect } from '@playwright/test';
import { actorCalled, Interaction } from '@serenity-js/core';

let apiContext: APIRequestContext;
let unauthContext: APIRequestContext;
let invalidKeyContext: APIRequestContext;
let lastResponse: APIResponse;
let lastResponseText: string;
let lastResponseJson: any = null;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY =
  process.env.API_KEY || process.env.BACKEND_API_KEY || '';

Before({ tags: '@api' }, async () => {
  apiContext = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      'X-API-Key': API_KEY,
      'X-App-Source': 'Charlotte-Wealth-BDD',
      'X-Requested-With': 'Playwright-API-Client',
    },
  });

  unauthContext = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      'X-App-Source': 'Charlotte-Wealth-BDD',
    },
  });

  invalidKeyContext = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      'X-API-Key': 'invalid-token-key-12345',
      'X-App-Source': 'Charlotte-Wealth-BDD',
    },
  });
});

After({ tags: '@api' }, async () => {
  if (apiContext) await apiContext.dispose();
  if (unauthContext) await unauthContext.dispose();
  if (invalidKeyContext) await invalidKeyContext.dispose();
});

// ================= Requests =================
When('{string} requests the API root health endpoint', async (actorName: string) => {
  await actorCalled(actorName).attemptsTo(
    Interaction.where(`#actor requests the API root endpoint`, async () => {
      lastResponse = await apiContext.get('/');
      lastResponseText = await lastResponse.text();
      try {
        lastResponseJson = JSON.parse(lastResponseText);
      } catch {
        lastResponseJson = null;
      }
    })
  );
});

When('{string} requests the API {string} endpoint', async (actorName: string, endpoint: string) => {
  await actorCalled(actorName).attemptsTo(
    Interaction.where(`#actor GET ${endpoint}`, async () => {
      lastResponse = await apiContext.get(endpoint);
      lastResponseText = await lastResponse.text();
      try {
        lastResponseJson = JSON.parse(lastResponseText);
      } catch {
        lastResponseJson = null;
      }
    })
  );
});

When('{string} requests the API {string} endpoint without an API key', async (actorName: string, endpoint: string) => {
  await actorCalled(actorName).attemptsTo(
    Interaction.where(`#actor GET ${endpoint} [Unauthenticated]`, async () => {
      lastResponse = await unauthContext.get(endpoint);
      lastResponseText = await lastResponse.text();
      try {
        lastResponseJson = JSON.parse(lastResponseText);
      } catch {
        lastResponseJson = null;
      }
    })
  );
});

When('{string} requests the API {string} endpoint with an invalid API key', async (actorName: string, endpoint: string) => {
  await actorCalled(actorName).attemptsTo(
    Interaction.where(`#actor GET ${endpoint} [Invalid Key]`, async () => {
      lastResponse = await invalidKeyContext.get(endpoint);
      lastResponseText = await lastResponse.text();
      try {
        lastResponseJson = JSON.parse(lastResponseText);
      } catch {
        lastResponseJson = null;
      }
    })
  );
});

When(
  '{string} sends a POST request to {string} with payload:',
  async (actorName: string, endpoint: string, payload: string) => {
    await actorCalled(actorName).attemptsTo(
      Interaction.where(`#actor POST ${endpoint}`, async () => {
        lastResponse = await apiContext.post(endpoint, {
          data: JSON.parse(payload),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        lastResponseText = await lastResponse.text();
        try {
          lastResponseJson = JSON.parse(lastResponseText);
        } catch {
          lastResponseJson = null;
        }
      })
    );
  }
);

When(
  '{string} evaluates rebalance recommendations with target allocations:',
  async (actorName: string, dataTable: DataTable) => {
    await actorCalled(actorName).attemptsTo(
      Interaction.where(`#actor POST /portfolio/allocation with DataTable targets`, async () => {
        const rows = dataTable.hashes();
        const targetAllocation: Record<string, number> = {};
        for (const row of rows) {
          targetAllocation[row.assetType] = parseFloat(row.targetPercent);
        }

        lastResponse = await apiContext.post('/portfolio/allocation?currency=THB', {
          data: { targetAllocation },
          headers: {
            'Content-Type': 'application/json',
          },
        });
        lastResponseText = await lastResponse.text();
        try {
          lastResponseJson = JSON.parse(lastResponseText);
        } catch {
          lastResponseJson = null;
        }
      })
    );
  }
);

When(
  '{string} fetches real-time market prices for symbols:',
  async (actorName: string, dataTable: DataTable) => {
    await actorCalled(actorName).attemptsTo(
      Interaction.where(`#actor POST /price/fetch-prices with DataTable symbols`, async () => {
        const rows = dataTable.hashes();
        const summaries = rows.map((r) => ({
          symbol: r.symbol,
          assetType: r.assetType,
        }));

        lastResponse = await apiContext.post('/price/fetch-prices', {
          data: { summaries },
          headers: {
            'Content-Type': 'application/json',
          },
        });
        lastResponseText = await lastResponse.text();
        try {
          lastResponseJson = JSON.parse(lastResponseText);
        } catch {
          lastResponseJson = null;
        }
      })
    );
  }
);

// ================= Assertions =================
Then('the response status should be {int}', async (expectedStatus: number) => {
  await actorCalled('Investor').attemptsTo(
    Interaction.where(`verify HTTP status is ${expectedStatus}`, async () => {
      expect(lastResponse.status()).toBe(expectedStatus);
    })
  );
});

Then('the response body should contain {string}', async (expectedContent: string) => {
  await actorCalled('Investor').attemptsTo(
    Interaction.where(`verify body contains "${expectedContent}"`, async () => {
      expect(lastResponseText).toContain(expectedContent);
    })
  );
});

Then('the response body should contain {int}', async (expectedNumber: number) => {
  await actorCalled('Investor').attemptsTo(
    Interaction.where(`verify body contains ${expectedNumber}`, async () => {
      expect(lastResponseText).toContain(expectedNumber.toString());
    })
  );
});

Then('the JSON response property {string} should be {string}', async (property: string, expectedVal: string) => {
  await actorCalled('Investor').attemptsTo(
    Interaction.where(`verify JSON property "${property}" is "${expectedVal}"`, async () => {
      expect(lastResponseJson).not.toBeNull();
      expect(String(lastResponseJson[property])).toBe(expectedVal);
    })
  );
});

Then('the JSON response property {string} should be true', async (property: string) => {
  await actorCalled('Investor').attemptsTo(
    Interaction.where(`verify JSON property "${property}" is true`, async () => {
      expect(lastResponseJson).not.toBeNull();
      expect(lastResponseJson[property]).toBe(true);
    })
  );
});

Then('the JSON response property {string} should be false', async (property: string) => {
  await actorCalled('Investor').attemptsTo(
    Interaction.where(`verify JSON property "${property}" is false`, async () => {
      expect(lastResponseJson).not.toBeNull();
      expect(lastResponseJson[property]).toBe(false);
    })
  );
});

Then('the JSON response property {string} should not be empty', async (property: string) => {
  await actorCalled('Investor').attemptsTo(
    Interaction.where(`verify JSON property "${property}" is populated`, async () => {
      expect(lastResponseJson).not.toBeNull();
      const val = lastResponseJson[property];
      if (Array.isArray(val)) {
        expect(val.length).toBeGreaterThan(0);
      } else if (typeof val === 'object' && val !== null) {
        expect(Object.keys(val).length).toBeGreaterThan(0);
      } else {
        expect(val).toBeDefined();
        expect(val).not.toBe('');
      }
    })
  );
});
