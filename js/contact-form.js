// Обработка формы обратной связи
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contact-form");
  const statusDiv = document.getElementById("form-status");

  if (!form || !statusDiv) {
    console.error("Форма или элемент статуса не найдены");
    return;
  }

  function resolveEndpoint() {
    const host = window.location.hostname || "";
    // На GitHub Pages нет backend'а — используем Formspree-заглушку
    if (host.includes("github.io")) {
      return "https://formspree.io/f/your_form_id";
    }
    // В остальных случаях (локально, Vercel, свой домен на Vercel) — серверлесс-функция
    return "/api/send-email";
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Получаем данные формы
    const formData = new FormData(form);
    const name = formData.get("name");
    const email = formData.get("email");
    const message = formData.get("message");

    // Базовая валидация
    if (!name || !email || !message) {
      showStatus("Пожалуйста, заполните все поля", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showStatus("Пожалуйста, введите корректный email", "error");
      return;
    }

    if (message.trim().length < 10) {
      showStatus("Сообщение должно содержать минимум 10 символов", "error");
      return;
    }

    // Отключаем кнопку во время отправки
    const submitBtn = form.querySelector(".contacts__form-btn");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляется...";

    try {
      const endpoint = resolveEndpoint();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
        }),
      });

      // Пытаемся прочесть JSON (если не JSON — создадим дефолтный объект)
      let result = {};
      try {
        result = await response.json();
      } catch (_) {}

      if (response.ok) {
        showStatus(
          "Сообщение успешно отправлено! Я свяжусь с вами в ближайшее время.",
          "success"
        );
        form.reset();
      } else {
        showStatus(
          result.message || "Произошла ошибка при отправке сообщения",
          "error"
        );
      }
    } catch (error) {
      console.error("Ошибка отправки:", error);
      showStatus(
        "Произошла ошибка при отправке сообщения. Попробуйте позже.",
        "error"
      );
    } finally {
      // Возвращаем кнопку в исходное состояние
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Функция для отображения статуса
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `contacts__form-status contacts__form-status--${type}`;

    // Автоматически скрываем сообщение через 5 секунд
    setTimeout(() => {
      statusDiv.className = "contacts__form-status";
      statusDiv.textContent = "";
    }, 5000);
  }

  // Функция валидации email
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
});