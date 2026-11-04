@api @playwright @tools @regression
Feature: Investor Modeling Tools and Financial Simulators
  As an active wealth manager
  I want mathematical modeling tools for TVM compounding, trade averaging, and portfolio rebalancing
  So that I can stress-test investment decisions and optimize capital allocation

  Scenario: Simulating multi-step BUY and SELL orders on an existing position
    When "Investor" sends a POST request to "/portfolio/tools/simulate" with payload:
      """
      {
        "initialPosition": {
          "symbol": "AAPL",
          "shares": 100,
          "avgCost": 150,
          "marketPrice": 180,
          "currency": "USD"
        },
        "steps": [
          { "action": "BUY", "shares": 50, "price": 170 },
          { "action": "SELL", "shares": 30, "price": 185 }
        ],
        "currency": "USD"
      }
      """
    Then the response status should be 200
    And the JSON response property "initial" should not be empty
    And the JSON response property "simulated" should not be empty
    And the JSON response property "delta" should not be empty

  Scenario: Solving required shares and capital outlay to reach a target average cost
    When "Investor" sends a POST request to "/portfolio/tools/solve-target" with payload:
      """
      {
        "initialPosition": {
          "symbol": "NVDA",
          "shares": 100,
          "avgCost": 150,
          "marketPrice": 120,
          "currency": "USD"
        },
        "targetAvgCost": 135,
        "purchasePrice": 120,
        "currency": "USD"
      }
      """
    Then the response status should be 200
    And the JSON response property "isValid" should be true
    And the JSON response property "requiredShares" should not be empty
    And the JSON response property "totalOutlay" should not be empty

  Scenario: Rejecting impossible target average cost parameters gracefully
    When "Investor" sends a POST request to "/portfolio/tools/solve-target" with payload:
      """
      {
        "initialPosition": {
          "symbol": "NVDA",
          "shares": 100,
          "avgCost": 150,
          "marketPrice": 120,
          "currency": "USD"
        },
        "targetAvgCost": 110,
        "purchasePrice": 120,
        "currency": "USD"
      }
      """
    Then the response status should be 200
    And the JSON response property "isValid" should be false
    And the JSON response property "errorMessage" should not be empty

  Scenario Outline: Calculating Time Value of Money projections across solve modes
    When "Investor" sends a POST request to "/portfolio/tools/tvm" with payload:
      """
      {
        "mode": "<mode>",
        "presentValue": 100000,
        "payment": 5000,
        "annualRatePct": 7,
        "years": 10,
        "compounding": "monthly",
        "timing": "end",
        "targetFutureValue": 1000000,
        "currency": "THB"
      }
      """
    Then the response status should be 200
    And the JSON response property "isValid" should be true
    And the JSON response property "mode" should be "<mode>"
    And the JSON response property "schedule" should not be empty

    Examples:
      | mode |
      | FV   |
      | PMT  |
      | PV   |
      | N    |
      | RATE |

  Scenario: Generating a standard buy-and-sell portfolio rebalance plan
    When "Investor" sends a POST request to "/portfolio/tools/rebalance" with payload:
      """
      {
        "mode": "standard",
        "currency": "THB"
      }
      """
    Then the response status should be 200
    And the JSON response property "mode" should be "standard"
    And the JSON response property "groups" should not be empty

  Scenario: Generating a buy-only minimum cash inflow rebalance plan
    When "Investor" sends a POST request to "/portfolio/tools/rebalance" with payload:
      """
      {
        "mode": "no-sell",
        "noSellSubMode": "min-inflow",
        "currency": "THB"
      }
      """
    Then the response status should be 200
    And the JSON response property "mode" should be "no-sell"
    And the JSON response property "groups" should not be empty

