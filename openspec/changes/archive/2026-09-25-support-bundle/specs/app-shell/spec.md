# Spec Delta

## MODIFIED Requirements

### Requirement: A fault in one page stays in that page
An unexpected fault while showing a page SHALL replace only that page with a plain message, the error text, a way to try again, a way to reload the window, and a way to save diagnostics (see `support-bundle`). The rest of the app, including the connection to the saber, SHALL keep working, and moving to another page SHALL clear the message.

#### Scenario: A page fails
- **WHEN** a page throws an error while rendering
- **THEN** the sidebar and header still work, the page shows "Something went wrong" with Try again and Reload, and choosing another page shows that page normally

#### Scenario: Saving diagnostics after a fault
- **WHEN** a page has failed and the owner presses Save diagnostics on its message
- **THEN** a diagnostics file is saved and shown in its folder, and its log includes the fault and where it happened
