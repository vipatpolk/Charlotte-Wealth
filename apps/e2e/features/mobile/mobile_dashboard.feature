@mobile @appium @dashboard @smoke
Feature: Mobile Executive Dashboard (Mobile)
  As a private banking client using mobile
  I want an executive portfolio overview, quick currency switching, and privacy masking
  So that I can securely check my net worth on mobile devices

  Background:
    Given "Alex" launches the Charlotte Wealth mobile app via Appium

  Scenario: Viewing the mobile executive dashboard and consolidated net worth card
    Then he should see the mobile app title "Charlotte Wealth"
    And he should see the mobile net worth card

  Scenario Outline: Switching mobile display currency
    When he switches the mobile currency to "<currency>"
    Then the mobile currency symbol should be "<symbol>"

    Examples:
      | currency | symbol |
      | USD      | $      |
      | THB      | ฿      |

  Scenario: Enabling mobile Privacy Mode to mask portfolio balances
    When he toggles mobile Privacy Mode
    Then mobile sensitive values should be masked

  Scenario: Toggling the mobile visual theme
    When he toggles the mobile visual theme
    Then the mobile theme should switch

