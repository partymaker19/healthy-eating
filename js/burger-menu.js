document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger-menu');
  const nav = document.getElementById('mobile-nav');
  const navLinks = document.querySelectorAll('.mobile-nav__item a');

  burger.addEventListener('click', () => {
    burger.classList.toggle('active');
    nav.classList.toggle('active');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      burger.classList.remove('active');
      nav.classList.remove('active');
    });
  });
});