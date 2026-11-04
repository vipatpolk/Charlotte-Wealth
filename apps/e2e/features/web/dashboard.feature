@web @playwright @dashboard @smoke
Feature: Executive Portfolio Dashboard (Web)
  As a private banking client of Charlotte Wealth
  I want an executive overview of my consolidated net worth, KPI metrics, and workspace settings
  So that I can evaluate my overall financial health at a glance

  Background:
    Given "Charlotte" opens the Charlotte Wealth web dashboard

  Scenario: Viewing the executive portfolio hero banner and consolidated net worth
    Then she should see the "Charlotte Wealth" brand title
    And she should see the consolidated net worth hero card

  Scenario: Reviewing primary portfolio KPI cards
    Then she should see the primary portfolio KPI cards

  Scenario Outline: Switching display currency between Thai Baht and US Dollar
    When she switches the display currency to "<currency>"
    Then the active currency symbol should be "<symbol>"

    Examples:
      | currency | symbol |
      | USD      | $      |
      | THB      | ฿      |

  Scenario: Enabling Privacy Mode to mask sensitive monetary amounts
    When she toggles Privacy Mode
    Then the sensitive portfolio values should be masked

  Scenario: Toggling the workspace visual theme
    When she toggles the visual theme
    Then the application theme should switch

