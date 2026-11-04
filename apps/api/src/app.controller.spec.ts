import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Charlotte Wealth API - Hello World!"', () => {
      expect(appController.getHello()).toBe('Charlotte Wealth API - Hello World!');
    });
  });

  describe('health', () => {
    it('should return healthy status', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.service).toBe('Charlotte Wealth Core API');
    });
  });

  describe('portfolio', () => {
    it('should return portfolio data for Lady Charlotte', () => {
      const portfolio = appController.getPortfolio();
      expect(portfolio.clientName).toBe('Lady Charlotte');
      expect(portfolio.totalNetWorth).toBe(2845430.0);
    });
  });
});
