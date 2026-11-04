@web @playwright @analytics @regression
Feature: Strategic Portfolio Analytics (Web)
  As a private wealth client
  I want to analyze portfolio performance and strategic asset allocation
  So that I can align my holdings with my long-term financial plan

  Background:
    Given "Charlotte" opens the Charlotte Wealth web dashboard
    And she navigates to the "analytics" view

  Scenario: Viewing the Portfolio Analytics overview
    Then she should see the Portfolio Analytics overview

  Scenario Outline: Switching between analytics sub-tabs
    When she switches to the "<subTab>" analytics sub-tab
    Then she should see the "<subTab>" analytics pane

    Examples:
      | subTab      |
      | Allocation  |
      | Performance |
      | Overview    |

