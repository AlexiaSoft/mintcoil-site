document.getElementById('copyright-year').textContent = new Date().getFullYear();

const toggle = document.getElementById('menu-toggle');
const navigation = document.getElementById('site-nav');
const mobile = window.matchMedia('(max-width: 767px)');

function setMenu(open) {
    navigation.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
}

toggle.hidden = false;
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
navigation.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
    }
});
mobile.addEventListener('change', () => {
    if (mobile.matches && navigation.contains(document.activeElement)) toggle.focus();
    setMenu(false);
});
