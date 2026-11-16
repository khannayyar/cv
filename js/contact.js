// contact.js - handles Google Sheets Apps Script submission
// Replace GOOGLE_SCRIPT_URL with your deployed Apps Script Web App URL
// Deployment notes:
//  - Script expects JSON POST with fields: name, email, phone, subject, message, timestamp, userAgent, referrer
//  - Honeypot field 'website' must remain empty (if filled -> treat as spam and abort)

const GOOGLE_SCRIPT_URL = window.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxfWzwM-8Mc7-AQQcXTT8s8X9KA1IzVR1c1jXVHNSjDzc42WiaTzGyYj7BlBay3lrU2Hg/exec';

(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmit');
  const btnText = submitBtn?.querySelector('.btn-text');
  const btnSpinner = submitBtn?.querySelector('.btn-spinner');
  const messageDiv = document.getElementById('formMessage');

  function showMessage(type, text, { html = false } = {}) {
    messageDiv.classList.remove('hidden');
    if (html) {
      messageDiv.innerHTML = text;
    } else {
      messageDiv.textContent = text;
    }
    const base = 'mt-4 p-4 rounded-lg';
    if (type === 'success') {
      messageDiv.className = `${base} bg-green-100 text-green-700`;
    } else if (type === 'error') {
      messageDiv.className = `${base} bg-red-100 text-red-700`;
    } else {
      messageDiv.className = `${base} bg-yellow-100 text-yellow-700`;
    }
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (btnSpinner) btnSpinner.classList.toggle('hidden', !isLoading);
    if (btnText) btnText.textContent = isLoading ? 'Sending...' : 'Send Message';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // The form uses novalidate, so run native field checks explicitly.
    if (!form.reportValidity()) return;
    const formData = new FormData(form);

    // Honeypot check
    if (formData.get('website')) {
      showMessage('error', 'Spam detected. Submission blocked.');
      return;
    }

    const data = Object.fromEntries(formData.entries());
    data.timestamp = new Date().toISOString();
    data.userAgent = navigator.userAgent;
    data.referrer = document.referrer;

    // Remove honeypot from payload
    delete data.website;

    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL')) {
      showMessage('error', 'Form not configured: set GOOGLE_SCRIPT_URL.');
      return;
    }

    // Offline quick check
    if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
      const mailto = buildMailto(data);
      showMessage(
        'error',
        `You're offline. Please reconnect and try again, or email me directly at <a class="underline" href="${mailto}">nayyar@su.edu.sa</a>.`,
        { html: true }
      );
      return;
    }

    setLoading(true);
    showMessage('info', 'Submitting...');

    let requestTimeout;
    try {
      // A simple text/plain POST avoids an unsupported Apps Script CORS preflight.
      const controller = new AbortController();
      requestTimeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });
      clearTimeout(requestTimeout);

      // Attempt to parse response when CORS allowed
      let ok = false;
      let resultText = '';
      try {
        const resultJson = await response.json();
        ok = response.ok && resultJson.status === 'success';
        if (response.ok && resultJson.status === 'partial') {
          showMessage('info', 'Your message was saved, but the email notification failed. Please email nayyar@su.edu.sa directly for urgent enquiries.');
          return;
        }
        resultText = resultJson.message || '';
      } catch (_) {
        // If no-cors or invalid JSON, fall back
      }

      if (ok) {
        showMessage('success', resultText || 'Thank you for your message! I will get back to you soon.');
        form.reset();
        setTimeout(() => messageDiv.classList.add('hidden'), 6000);
      } else {
        throw new Error(`Submission failed: status ${response.status}`);
      }
    } catch (err) {
      clearTimeout(requestTimeout);
      // Do not retry automatically: the server may already have saved the message.
      const mailto = buildMailto(data);
      showMessage('error', `Delivery could not be confirmed. Your message is still in the form. Please <a class="underline" href="${mailto}">send it by email to nayyar@su.edu.sa</a>.`, { html: true });
    } finally {
      clearTimeout(requestTimeout);
      setLoading(false);
    }
  });

  function buildMailto(data) {
    const subject = encodeURIComponent(data.subject ? `[Website] ${data.subject}` : 'Contact from website');
    const bodyLines = [
      `Name: ${data.name || ''}`,
      `Email: ${data.email || ''}`,
      `Phone: ${data.phone || ''}`,
      '',
      (data.message || '')
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    return `mailto:nayyar@su.edu.sa?subject=${subject}&body=${body}`;
  }
})();
