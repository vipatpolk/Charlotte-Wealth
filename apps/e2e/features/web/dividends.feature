@web @playwright @dividends @regression
Feature: Dividend Cashflow and Income Yield (Web)
  As an income-focused investor
  I want to view dividend cashflows and filter records by asset classes and years
  So that I can monitor yield on cost and projected annual passive income

  Background:
    Given "Charlotte" opens the Charlotte Wealth web dashboard
    And she navigates to the "dividends" view

  Scenario: Viewing Dividend & Income Yield summary
    Then she should see the Dividend & Income Yield summary

  Scenario Outline: Filtering dividend records by asset class category
    When she filters dividends by asset category "<category>"
    Then the dividend summary should update for "<category>"

    Examples:
      | category     |
      | All Assets   |
      | U.S. Stocks  |
      | Thai Stocks  |
      | Mutual Funds |
      | Bonds        |

  Scenario: Filtering dividend cashflows by historical year
    When she filters dividends by year "All Time"
    Then the dividend cashflow ledger should reflect "All Time"

