@web @playwright @transactions @regression
Feature: Transaction History Feed and Trade Analysis (Web)
  As an investor tracking cost bases
  I want to view past trades and filter records by asset classes and symbols
  So that I can audit historical buy, sell, and exchange executions

  Background:
    Given "Charlotte" opens the Charlotte Wealth web dashboard
    And she navigates to the "transactions" view

  Scenario: Viewing the All Symbols transaction feed
    Then she should see the All Symbols transaction feed

  Scenario: Opening the transaction symbol selector
    When she opens the transaction symbol selector
    Then the symbol dropdown menu should be visible

  Scenario Outline: Filtering transactions by asset category
    When she opens the transaction symbol selector
    And she filters transactions by asset category "<category>"
    Then the transaction filter "<category>" should be active

    Examples:
      | category |
      | U.S.     |
      | Thai     |
      | Crypto   |

  Scenario: Searching the transaction feed for a specific symbol
    When she opens the transaction symbol selector
    And she searches the transaction feed for "AAPL"
    Then the matching transaction records should be displayed

