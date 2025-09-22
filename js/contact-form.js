// js/contact-form.js - handles contact form submission via fetch to backend
(function () {
  const form = document.getElementById('contact-form');
  const statusBox = document.getElementById('form-status');
  if (!form || !statusBox) return;

  const endpoint = form.dataset.endpoint && form.dataset.endpoint.trim()
    ? form.dataset.endpoint.trim()
    : '/api/contact';

  function setStatus(message, type) {
    statusBox.textContent = message;
    statusBox.classList.remove('success', 'error');
    if (type) statusBox.classList.add(type);
  }

  function validate({ name, email, message }) {
    const errors = [];
    if (!name || name.trim().length < 2) errors.push('Имя должно быть не короче 2 символов');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) errors.push('Укажите корректный email');
    if (!message || message.trim().length < 5) errors.push('Сообщение должно быть не короче 5 символов');
    return errors;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      message: String(formData.get('message') || ''),
    };

    const errors = validate(payload);
    if (errors.length) {
      setStatus(errors.join('\n'), 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка...';
    }
    setStatus('Отправка сообщения...', null);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const msg = (data && (data.errors && data.errors.join('\n'))) || data.error || 'Ошибка при отправке. Попробуйте ещё раз.';
        setStatus(msg, 'error');
      } else {
        const modeNote = data.mode === 'file' && data.savedTo
          ? ` (локально сохранено: ${data.savedTo})`
          : '';
        setStatus('Сообщение успешно отправлено!' + modeNote, 'success');
        form.reset();
      }
    } catch (err) {
      setStatus('Сеть недоступна или сервер не отвечает. Попробуйте позже.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
})();