@api @playwright @dividends @regression
Feature: Portfolio Dividend Cashflows and Income Yield
  As an income-focused investor
  I want to track historical dividend cashflows, withholding tax, and Yield on Cost
  So that I can monitor passive income growth and forecast annual distributions

  Scenario: Retrieving consolidated dividend cashflows, withholding tax, and Yield on Cost
    When "Investor" requests the API "/portfolio/dividend?currency=THB&tab_id=all" endpoint
    Then the response status should be 200
    And the JSON response property "currency" should be "THB"
    And the JSON response property "annualDividends" should not be empty
    And the JSON response property "monthlyDividends" should not be empty
    And the JSON response property "records" should not be empty

  Scenario Outline: Retrieving dividend summaries converted into target currency
    When "Investor" requests the API "/portfolio/dividend?currency=<currency>&tab_id=all" endpoint
    Then the response status should be 200
    And the JSON response property "currency" should be "<currency>"
    And the JSON response property "assetTypeSummaries" should not be empty

    Examples:
      | currency |
      | THB      |
      | USD      |

  Scenario Outline: Filtering dividend analytics by eligible income-generating asset classes
    When "Investor" requests the API "/portfolio/dividend?currency=THB&tab_id=<tabId>" endpoint
    Then the response status should be 200
    And the JSON response property "currency" should be "THB"
    And the JSON response property "symbolSummaries" should not be empty

    Examples:
      | tabId       |
      | us-stock    |
      | thai-stock  |
      | mutual-fund |

