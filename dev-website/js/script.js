/**
 * Team T Studio - Main Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const navIcon = navToggle.querySelector('.material-symbols-outlined');

  navToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    navIcon.textContent = mobileMenu.classList.contains('active') ? 'close' : 'menu';
  });

  // Close mobile menu on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
      navIcon.textContent = 'menu';
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});