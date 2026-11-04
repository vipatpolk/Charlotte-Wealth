@mobile @appium @holdings @regression
Feature: Mobile Holdings and FIFO Lots View (Mobile)
  As a mobile wealth management client
  I want to review my asset holdings and filter by category on mobile
  So that I can monitor portfolio positions on the go

  Background:
    Given "Alex" launches the Charlotte Wealth mobile app via Appium
    And he switches to the "holdings" mobile view

  Scenario: Viewing the mobile Holdings and FIFO Share Lots overview
    Then he should see the mobile "holdings" section

  Scenario: Opening the mobile asset category selector dropdown
    When he opens the mobile asset category selector
    Then the mobile category dropdown should be open

  Scenario Outline: Filtering mobile holdings by asset category
    When he opens the mobile asset category selector
    And he filters mobile holdings by category "<category>"
    Then the mobile category "<category>" should be selected

    Examples:
      | category       |
      | U.S. Stock     |
      | Cryptocurrency |

  Scenario: Searching mobile holdings by symbol query
    When he searches mobile holdings for "AAPL"
    Then the matching mobile holding should be displayed

