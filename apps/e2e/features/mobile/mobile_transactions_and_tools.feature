@mobile @appium @transactions @tools @regression
Feature: Mobile Transactions Feed and Financial Tools (Mobile)
  As an active mobile client
  I want to view transaction feeds and access modeling tools on mobile
  So that I can analyze past trades and test future investment scenarios

  Background:
    Given "Alex" launches the Charlotte Wealth mobile app via Appium

  Scenario: Navigating to the mobile Transactions History feed
    When he switches to the "transactions" mobile view
    Then he should see the mobile "transactions" section

  Scenario: Opening the mobile transaction symbol filter
    When he switches to the "transactions" mobile view
    And he opens the mobile transaction symbol filter
    Then the mobile transaction filter menu should be open

  Scenario Outline: Selecting financial tools on mobile
    When he switches to the "tools" mobile view
    And he selects the "<toolId>" tool on mobile
    Then the mobile tool "<toolId>" should be active

    Examples:
      | toolId               |
      | avg-cost-calculator  |
      | tvm-calculator       |
      | rebalance-planner    |

  Scenario Outline: Selecting TVM solve modes on mobile
    When he switches to the "tools" mobile view
    And he selects the "tvm-calculator" tool on mobile
    And he selects the "<mode>" mobile TVM mode
    Then the mobile TVM mode "<mode>" should be active

    Examples:
      | mode |
      | FV   |
      | PMT  |
      | PV   |

  Scenario Outline: Toggling the rebalance mode on mobile
    When he switches to the "tools" mobile view
    And he selects the "rebalance-planner" tool on mobile
    And he switches mobile rebalance mode to "<mode>"
    Then the mobile "<mode>" rebalance mode should be active

    Examples:
      | mode     |
      | No-Sell  |
      | Standard |

