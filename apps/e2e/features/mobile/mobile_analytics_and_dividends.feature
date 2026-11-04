@mobile @appium @analytics @dividends @regression
Feature: Mobile Portfolio Analytics and Income Yield (Mobile)
  As an investor using mobile
  I want to review asset allocation and dividend cashflows
  So that I can monitor portfolio health and passive income on mobile devices

  Background:
    Given "Alex" launches the Charlotte Wealth mobile app via Appium

  Scenario: Navigating to the mobile Analytics view and inspecting overview
    When he switches to the "analytics" mobile view
    Then he should see the mobile "analytics" section

  Scenario Outline: Switching between analytics sub-tabs on mobile
    When he switches to the "analytics" mobile view
    And he selects the "<subTab>" mobile analytics tab
    Then the mobile "<subTab>" analytics pane should be active

    Examples:
      | subTab      |
      | Allocation  |
      | Performance |

  Scenario: Navigating to the mobile Dividends view
    When he switches to the "dividends" mobile view
    Then he should see the mobile "dividends" section

  Scenario: Filtering mobile dividends by asset type
    When he switches to the "dividends" mobile view
    And he filters mobile dividends by category "U.S. Stocks"
    Then the mobile dividend category "U.S. Stocks" should be active

