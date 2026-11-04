@api @playwright @market-data @smoke
Feature: Market Price Feeds and Currency Exchange Rates
  As a financial modeling engine
  I want real-time market prices, mutual fund NAVs, and currency exchange rates
  So that multi-currency asset valuations are accurately converted and refreshed

  Scenario: Fetching real-time USD to THB currency exchange rate
    When "Investor" requests the API "/price/exchange-rate" endpoint
    Then the response status should be 200
    And the JSON response property "rate" should not be empty

  Scenario Outline: Fetching exchange rate for custom currency pairs
    When "Investor" requests the API "/price/exchange-rate?from_currency=<from>&to_currency=<to>" endpoint
    Then the response status should be 200
    And the JSON response property "rate" should not be empty

    Examples:
      | from | to  |
      | USD  | THB |
      | THB  | USD |

  Scenario: Fetching batch market prices for equity and cryptocurrency symbols
    When "Investor" fetches real-time market prices for symbols:
      | symbol | assetType |
      | AAPL   | us-stock  |
      | BTC    | crypto    |
    Then the response status should be 201
    And the JSON response property "prices" should not be empty
    And the JSON response property "rate" should not be empty

  Scenario: Fetching mutual fund Net Asset Values
    When "Investor" sends a POST request to "/nav/fetch" with payload:
      """
      {
        "symbols": ["K-USXNDQ-A(A)"]
      }
      """
    Then the response status should be 201
    And the response body should contain "K-USXNDQ-A(A)"

