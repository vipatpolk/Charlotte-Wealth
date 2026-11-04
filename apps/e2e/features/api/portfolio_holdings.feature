@api @playwright @holdings @regression
Feature: Consolidated Portfolio Holdings and FIFO Share Lots
  As a private banking portfolio manager
  I want to retrieve consolidated holdings and FIFO share lots across multiple asset classes
  So that investor positions reflect accurate valuations, cost bases, and realized profits

  Scenario: Retrieving consolidated portfolio holdings across all asset classes
    When "Investor" requests the API "/portfolio/holdings?tab_id=all&currency=THB" endpoint
    Then the response status should be 200
    And the JSON response property "tabId" should be "all"
    And the JSON response property "currency" should be "THB"
    And the JSON response property "summary" should not be empty
    And the JSON response property "openPositions" should not be empty

  Scenario Outline: Retrieving portfolio holdings valued in different display currencies
    When "Investor" requests the API "/portfolio/holdings?tab_id=us-stock&currency=<currency>" endpoint
    Then the response status should be 200
    And the JSON response property "currency" should be "<currency>"
    And the JSON response property "summary" should not be empty

    Examples:
      | currency |
      | THB      |
      | USD      |

  Scenario Outline: Filtering portfolio holdings by specific asset class tab
    When "Investor" requests the API "/portfolio/holdings?tab_id=<tabId>&currency=THB" endpoint
    Then the response status should be 200
    And the JSON response property "tabId" should be "<tabId>"
    And the JSON response property "summary" should not be empty

    Examples:
      | tabId           |
      | us-stock        |
      | thai-stock      |
      | crypto          |
      | mutual-fund     |
      | closed-position |

  Scenario: Ingesting consolidated FIFO share lots across all Google Sheet tabs
    When "Investor" requests the API "/share-lot/sheets" endpoint
    Then the response status should be 200
    And the JSON response property "summaries" should not be empty
    And the JSON response property "totalLots" should not be empty

  Scenario: Ingesting FIFO share lots for a specific asset class tab
    When "Investor" requests the API "/share-lot/sheet/us-stock" endpoint
    Then the response status should be 200
    And the JSON response property "summaries" should not be empty
    And the JSON response property "totalSymbols" should not be empty

