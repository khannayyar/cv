// Deploy this file in Google Apps Script; see docs/contact-form.md.
var SHEET_ID = '1nJ1xLoIlJvC8nMn9WMRNydoNzZisd2Ca2Iil7SVSEFk';
// Preserves the existing notification recipient. Change here if needed.
var NOTIFY_TO = 'khannayyar@me.com';

function getTargetSheet_() {
  var book = SpreadsheetApp.openById(SHEET_ID);
  return book.getSheets()[0];
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({status: 'ready', service: 'Portfolio contact form'});
}

function parsePostData_(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (_) {}
  }
  return (e && e.parameter) || {};
}

// Store visitor text as text, including values beginning with spreadsheet formulas.
function sheetText_(value) {
  return /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
}

function doPost(e) {
  try {
    var data = parsePostData_(e);
    if (data.website) return json_({status: 'error', message: 'Submission rejected.'});
    var limits = {name: 200, email: 254, phone: 100, subject: 300, message: 10000};
    Object.keys(limits).forEach(function (key) {
      data[key] = String(data[key] || '').trim();
      if (data[key].length > limits[key]) throw new Error('Field too long: ' + key);
    });
    if (!data.name || !data.subject || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return json_({status: 'error', message: 'Please complete all required fields with a valid email.'});
    }
    var timestamp = new Date();
    var row = [timestamp].concat(['name','email','phone','subject','message'].map(function(key) { return sheetText_(data[key]); }));
    row.push(sheetText_(String(data.userAgent || '').slice(0,1000)), sheetText_(String(data.referrer || '').slice(0,2000)));
    getTargetSheet_().appendRow(row);
    try {
      if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily email quota exhausted');
      MailApp.sendEmail({
        to: NOTIFY_TO,
        replyTo: data.email,
        subject: 'Portfolio enquiry: ' + data.subject.replace(/[\r\n]/g, ' '),
        body: ['New portfolio enquiry', 'Date: ' + timestamp.toISOString(), 'Name: ' + data.name, 'Email: ' + data.email, 'Phone: ' + data.phone, '', data.message].join('\n'),
        name: 'Portfolio Contact'
      });
    } catch (mailError) {
      console.error('Message saved; notification failed: ' + mailError);
      return json_({status: 'partial', saved: true, emailSent: false});
    }
    return json_({status: 'success', saved: true, emailSent: true, message: 'Your message was saved and the email notification was sent. Thank you.'});
  } catch (error) {
    console.error('Contact submission failed: ' + error);
    return json_({status: 'error', message: 'Unable to save your message. Please email directly.'});
  }
}

// Run manually once to authorize spreadsheet and email access. Sends no email.
function authorizeContactForm() {
  Logger.log('Spreadsheet available: ' + getTargetSheet_().getName());
  Logger.log('Remaining email quota: ' + MailApp.getRemainingDailyQuota());
}

// Run manually in the Apps Script editor. Sends one diagnostic email to NOTIFY_TO.
// Errors intentionally propagate so the execution log shows the exact cause.
function testNotificationEmail() {
  var quota = MailApp.getRemainingDailyQuota();
  Logger.log('Notification recipient: ' + NOTIFY_TO);
  Logger.log('Remaining email quota: ' + quota);
  if (quota < 1) throw new Error('Daily email quota exhausted. Try after the quota resets.');
  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: 'Portfolio contact notification test',
    body: 'This is a diagnostic email from your portfolio Google Apps Script. If received, email sending works for this account.',
    name: 'Portfolio Contact'
  });
  Logger.log('Google accepted the test email. Check the recipient inbox and Junk folder.');
}
