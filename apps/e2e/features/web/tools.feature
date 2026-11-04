@web @playwright @tools @regression
Feature: Investor Financial Tools and Modeling Engines (Web)
  As an active wealth manager
  I want access to trade simulators, compound growth calculators, and rebalancing planners
  So that I can evaluate scenarios before committing capital

  Background:
    Given "Charlotte" opens the Charlotte Wealth web dashboard
    And she navigates to the "tools" view

  Scenario: Viewing the Average Cost & Trade Simulator by default
    Then she should see the Financial Toolkit hub
    And the Average Cost Calculator should be active by default

  Scenario: Enabling Custom Simulation mode in the Average Cost Calculator
    When she enables Custom Simulation mode
    Then the custom simulation badge should be displayed

  Scenario Outline: Selecting solve modes in the Time Value of Money calculator
    When she switches to the Time Value of Money calculator
    And she selects the "<mode>" TVM solve mode
    Then the TVM calculation mode should be "<mode>"

    Examples:
      | mode |
      | FV   |
      | PMT  |
      | PV   |
      | N    |
      | RATE |

  Scenario: Switching to the Portfolio Rebalance Planner
    When she switches to the Portfolio Rebalance Planner
    Then the "Standard" rebalance mode should be active

  Scenario Outline: Toggling the Rebalance Planner mode
    When she switches to the Portfolio Rebalance Planner
    And she toggles the rebalance mode to "<mode>"
    Then the "<mode>" rebalance mode should be active

    Examples:
      | mode     |
      | No-Sell  |
      | Standard |

