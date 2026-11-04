@web @playwright @holdings @regression
Feature: Portfolio Holdings and FIFO Lots View (Web)
  As an active investor
  I want to inspect individual positions, filter by asset categories, and search specific symbols
  So that I can verify my open holdings and realized performance

  Background:
    Given "Charlotte" opens the Charlotte Wealth web dashboard
    And she navigates to the "holdings" view

  Scenario: Viewing consolidated portfolio overview metrics and holdings sections
    Then she should see the portfolio overview metrics and holdings sections

  Scenario Outline: Filtering holdings by asset class tab
    When she filters holdings by asset tab "<tabLabel>"
    Then the asset tab "<tabLabel>" should be selected

    Examples:
      | tabLabel        |
      | U.S. Stock      |
      | Thai Stock      |
      | Cryptocurrency  |
      | Mutual Fund     |
      | Closed Position |

  Scenario: Searching holdings by ticker symbol
    When she searches holdings for symbol "AAPL"
    Then the holdings view should display the filtered symbol "AAPL"

  Scenario: Clearing the symbol search filter to restore all positions
    When she searches holdings for symbol "AAPL"
    And she clears the symbol search filter
    Then all portfolio holdings should be restored

