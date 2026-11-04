@api @playwright @health @security @smoke
Feature: Core Service Health and API Key Security
  As a private banking client application
  I want the core API services to be operational and protected by authentication
  So that confidential wealth management records remain secure and accessible

  Scenario: Root service endpoint responds with operational greeting
    When "Investor" requests the API root health endpoint
    Then the response status should be 200
    And the response body should contain "Charlotte Wealth API - Hello World!"

  Scenario: Service health check reports operational status and timestamp
    When "Investor" requests the API "/health" endpoint
    Then the response status should be 200
    And the JSON response property "status" should be "healthy"
    And the JSON response property "service" should be "Charlotte Wealth Core API"
    And the JSON response property "timestamp" should not be empty

  Scenario: Executive summary endpoint returns client profile and net worth
    When "Investor" requests the API "/api/portfolio" endpoint
    Then the response status should be 200
    And the JSON response property "clientName" should be "Lady Charlotte"
    And the JSON response property "currency" should be "USD"
    And the response body should contain 2845430

  Scenario: Protected portfolio endpoint rejects unauthenticated requests
    When "Investor" requests the API "/portfolio/holdings?tab_id=all&currency=THB" endpoint without an API key
    Then the response status should be 401
    And the JSON response property "detail" should be "Invalid or missing API Key"

  Scenario: Protected portfolio endpoint rejects invalid API keys
    When "Investor" requests the API "/portfolio/holdings?tab_id=all&currency=THB" endpoint with an invalid API key
    Then the response status should be 401
    And the JSON response property "detail" should be "Invalid or missing API Key"

