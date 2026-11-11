// Google Apps Script for Contact Form Integration
// 
// Instructions:
// 1. Create a new Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Delete any existing code and paste this code
// 4. Save the project
// 5. Deploy > New deployment
// 6. Select type: Web app
// 7. Execute as: Me
// 8. Who has access: Anyone
// 9. Deploy and copy the Web App URL
// 10. Update contact.html with this URL

// Optional: hard-code your Sheet ID to ensure reliability in web-app context.
// If you created the script from Extensions > Apps Script within the Sheet, you can leave this as ''
// and the script will use the container-bound sheet. Otherwise, set SHEET_ID to your spreadsheet ID.
var SHEET_ID = '1nJ1xLoIlJvC8nMn9WMRNydoNzZisd2Ca2Iil7SVSEFk';

function getTargetSheet_() {
  var ss;
  if (SHEET_ID && SHEET_ID.trim() !== '') {
    ss = SpreadsheetApp.openById(SHEET_ID);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  return ss.getActiveSheet();
}

function parsePostData_(e) {
  // Accept JSON and form-encoded payloads
  var data = {};
  try {
    var ctype = (e.postData && e.postData.type) || '';
    if (ctype.indexOf('application/json') > -1) {
      data = JSON.parse(e.postData.contents || '{}');
    } else if (e.parameter && Object.keys(e.parameter).length) {
      // application/x-www-form-urlencoded or multipart/form-data are available on e.parameter
      data = e.parameter;
    } else if (e.postData && e.postData.contents) {
      // Some deployments send text/plain; try JSON parse, else fallback to querystring parse
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = parseQueryString_(e.postData.contents);
      }
    }
  } catch (err) {
    // Last resort
    data = (e && e.parameter) ? e.parameter : {};
  }
  return data || {};
}

function parseQueryString_(qs) {
  var out = {};
  if (!qs) return out;
  qs.split('&').forEach(function (pair) {
    var idx = pair.indexOf('=');
    if (idx > -1) {
      var k = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' '));
      var v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
      out[k] = v;
    }
  });
  return out;
}

function doPost(e) {
  try {
    var sheet = getTargetSheet_();
    var data = parsePostData_(e);
    var timestamp = new Date();

    // Simple honeypot: ignore obvious bots but return success to avoid probing
    if (data.website && String(data.website).trim() !== '') {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', message: 'Submitted' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([
      timestamp,
      data.name || '',
      data.email || '',
      data.phone || '',
      data.subject || '',
      data.message || '',
      data.userAgent || '',
      data.referrer || ''
    ]);

    // Email notification settings
    var NOTIFY_TO = 'nayyar@outlook.in'; // Change if you want a different recipient
    var ENABLE_EMAIL = true;            // Toggle notifications

    if (ENABLE_EMAIL) {
      var plainBody = [
        'New contact form submission',
        '----------------------------------',
        'Date: ' + timestamp.toISOString(),
        'Name: ' + (data.name || ''),
        'Email: ' + (data.email || ''),
        'Phone: ' + (data.phone || ''),
        'Subject: ' + (data.subject || ''),
        '',
        'Message:',
        (data.message || ''),
        '',
        'User Agent: ' + (data.userAgent || ''),
        'Referrer: ' + (data.referrer || '')
      ].join('\n');

      var htmlBody = '<h2 style="font-family:Arial;margin-bottom:8px;">New Contact Form Submission</h2>' +
        '<table style="border-collapse:collapse;font-family:Arial;font-size:14px;">' +
        ['Date','Name','Email','Phone','Subject'].map(function(label){
          var val = '';
          switch(label){
            case 'Date': val = timestamp.toISOString(); break;
            case 'Name': val = data.name || ''; break;
            case 'Email': val = data.email || ''; break;
            case 'Phone': val = data.phone || ''; break;
            case 'Subject': val = data.subject || ''; break;
          }
          return '<tr><td style="padding:4px 8px;font-weight:bold;background:#f3f4f6;">'+label+'</td><td style="padding:4px 8px;">'+val+'</td></tr>';
        }).join('') +
        '<tr><td style="padding:4px 8px;font-weight:bold;background:#f3f4f6;vertical-align:top;">Message</td><td style="padding:8px 8px;white-space:pre-line;">'+(data.message || '')+'</td></tr>' +
        '<tr><td style="padding:4px 8px;font-weight:bold;background:#f3f4f6;">User Agent</td><td style="padding:4px 8px;">'+(data.userAgent || '')+'</td></tr>' +
        '<tr><td style="padding:4px 8px;font-weight:bold;background:#f3f4f6;">Referrer</td><td style="padding:4px 8px;">'+(data.referrer || '')+'</td></tr>' +
        '</table>' +
        '<p style="font-family:Arial;font-size:12px;color:#6b7280;margin-top:16px;">This message was sent via your portfolio contact form.</p>';

      try {
        MailApp.sendEmail({
          to: NOTIFY_TO,
            subject: 'New Contact Form Submission: ' + (data.subject || 'No Subject'),
          body: plainBody,
          htmlBody: htmlBody,
          name: 'Portfolio Contact Bot'
        });
      } catch(mailErr) {
        // Log but don't fail the whole request
        Logger.log('Email send failed: ' + mailErr);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: 'Form submitted successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to verify the script works
function testDoPost() {
  var testData = {
    postData: {
      contents: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        subject: 'Test Subject',
        message: 'This is a test message'
      })
    }
  };
  
  var result = doPost(testData);
  Logger.log(result.getContent());
}
