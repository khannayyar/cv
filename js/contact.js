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
    if (btnText) btnText.textContent = isLoading ? 'Sending...' : 'Send Message 🚀';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic front-end validation (HTML required attributes already help)
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

    try {
      // Primary attempt: CORS-friendly JSON POST with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });
      clearTimeout(timeout);

      // Attempt to parse response when CORS allowed
      let ok = response.ok;
      let resultText = '';
      try {
        const resultJson = await response.json();
        ok = ok && resultJson.status === 'success';
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
      console.warn('Contact form primary attempt failed, trying no-cors fallback:', err);
      // Fallback: Send as x-www-form-urlencoded with no-cors (Apps Script will still receive it)
      try {
        const params = new URLSearchParams();
        Object.entries(data).forEach(([k, v]) => params.append(k, String(v ?? '')));
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: params,
          mode: 'no-cors'
        });
        showMessage(
          'success',
          'Thanks! Your message was sent. If you don’t hear back soon, please email me as well.'
        );
        form.reset();
        setTimeout(() => messageDiv.classList.add('hidden'), 6000);
      } catch (fallbackErr) {
        console.error('Contact form fallback failed:', fallbackErr);
        const mailto = buildMailto(data);
        showMessage(
          'error',
          `Error sending message. Please email me directly at <a class="underline" href="${mailto}">nayyar@su.edu.sa</a>.`,
          { html: true }
        );
      }
    } finally {
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
