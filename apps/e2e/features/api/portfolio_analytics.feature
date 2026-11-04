@api @playwright @analytics @regression
Feature: Portfolio Performance Analytics and Asset Allocation
  As a private banking wealth advisor
  I want to analyze historical performance and calculate strategic asset allocation
  So that client portfolios maintain appropriate risk-adjusted returns and diversification

  Scenario Outline: Retrieving portfolio performance analytics across standard timeframes
    When "Investor" requests the API "/portfolio/performance?timeframe=<timeframe>&currency=THB" endpoint
    Then the response status should be 200
    And the JSON response property "timeframe" should be "<timeframe>"
    And the JSON response property "summary" should not be empty
    And the JSON response property "assetTypePerformance" should not be empty

    Examples:
      | timeframe |
      | ALL       |
      | 1Y        |
      | YTD       |

  Scenario: Retrieving portfolio performance for a custom date range
    When "Investor" requests the API "/portfolio/performance?timeframe=CUSTOM&start_date=2025-01-01&end_date=2025-12-31&currency=THB" endpoint
    Then the response status should be 200
    And the JSON response property "timeframe" should be "CUSTOM"
    And the JSON response property "startDate" should be "2025-01-01"
    And the JSON response property "endDate" should be "2025-12-31"

  Scenario: Calculating current asset allocation, currency exposure, and holding concentration
    When "Investor" sends a POST request to "/portfolio/allocation?currency=THB" with payload:
      """
      {}
      """
    Then the response status should be 200
    And the JSON response property "currency" should be "THB"
    And the JSON response property "currencyExposure" should not be empty
    And the JSON response property "holdingsConcentration" should not be empty

  Scenario: Evaluating rebalance recommendations against custom target allocations
    When "Investor" evaluates rebalance recommendations with target allocations:
      | assetType    | targetPercent |
      | us-stock     | 50            |
      | thai-stock   | 20            |
      | crypto       | 10            |
      | mutual-fund  | 15            |
      | bond         | 5             |
    Then the response status should be 200
    And the JSON response property "currency" should be "THB"
    And the JSON response property "recommendations" should not be empty

