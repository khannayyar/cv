# Restore contact delivery

The website uses Google Apps Script to save enquiries in Google Sheets and notify
`khannayyar@me.com`. The public contact email is `nayyar@su.edu.sa`.
No automatic reply to the visitor is configured. MailApp acceptance does not
prove inbox delivery; check Junk/Spam as well.

1. Open the existing Google Sheet, then **Extensions → Apps Script**.
2. Replace the script with `scripts/google-apps-script.js` from this repository.
   Verify `SHEET_ID` and `NOTIFY_TO`. Messages go into the first worksheet.
3. Select **authorizeContactForm**, click **Run**, and grant spreadsheet and email
   permissions using the account that owns the sheet. This checks access without
   sending a message. Resolve any error in the execution log first.
4. Open **Deploy → Manage deployments**, edit the existing web app, select
   **New version**, set **Execute as: Me** and **Who has access: Anyone**, then deploy.
   If your organization prevents anonymous access, use an account that permits it.
5. Keep the existing `/exec` URL if editing the same deployment. If Google gives
   you a different URL, replace `GOOGLE_SCRIPT_URL` in `js/contact.js`.
6. Open the `/exec` URL in an incognito window. It should show JSON with
   `status: ready`, without asking for sign-in.
7. Publish the website changes to GitHub Pages. Submit a clearly labelled test
   enquiry. Verify the row in Sheets and the notification in your inbox/Junk.
   The Apps Script **Executions** panel records permission and mail errors.

The browser now sends one text/plain JSON request without a preflight. It does
not silently resend after a timeout or report success for an unreadable response.
A saved message with a failed email notification is reported separately.

## Message saved, notification failed

This response means Sheets accepted the message but MailApp threw an exception.
Open **Executions**, select the corresponding `doPost`, and expand its logs to
read `Message saved; notification failed:` followed by the exact Google error.
Because the script catches this exception, the execution may appear completed.

For a direct test, paste the latest script into Apps Script, select
**testNotificationEmail**, and click **Run**. This sends one test email to
`NOTIFY_TO` and lets errors appear directly. Grant the send-email permission if
requested. A zero remaining quota requires waiting for the quota to reset;
permission or organization-policy errors must be resolved in that Google account.
After correcting authorization, update the web app deployment to a new version
with **Execute as: Me**, then test the website again.
