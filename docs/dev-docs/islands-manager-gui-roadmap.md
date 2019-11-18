# v1.0.1 #
- Adjust the menu names and ordering as per the proposal:
-- "Menu" renamed to "Window"
-- Window menu contains "Show/Hide", "Minimize" and "Quit"
-- Version Info moved to "Help" menu
- Fix awkward close/hide/minimize behavior per https://github.com/viocost/islands/issues/18
-- System close button performs show/hide behavior
-- Show/Hide pops up notification in the system tray to advertise itself

# v1.0.2 #
- Add missing handler for recieving shutdown messages from Windows (in application.py, using pywin32/win32api, see https://stackoverflow.com/questions/1411186/python-windows-shutdown-events
- Possibly add an option to quit and shutdown the Island at the same time (probably needed to make the above work).
# v1.1.0 #
- Redesign of the UI to better showcase diagnostic data
-- The big logo gets shrunk (replaced with new design time permitting)
-- A running island will display diagnostic info about it's connection status
-- A tail view of the logs will be visible in the main display with a button to go to the full view
-- Torrent activity info will show in the main display

