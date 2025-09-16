document.addEventListener("DOMContentLoaded", function () {
  const thumb = document.getElementById("serf-thumb");
  const modal = document.getElementById("serf-modal");
  const close = document.getElementById("serf-modal-close");
  if (!thumb || !modal || !close) return;
  thumb.addEventListener("click", function () {
    modal.classList.add("modal--open");
  });
  close.addEventListener("click", function () {
    modal.classList.remove("modal--open");
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.classList.remove("modal--open");
  });
});