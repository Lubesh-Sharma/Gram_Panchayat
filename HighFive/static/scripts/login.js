const loginOptions = document.querySelectorAll('.login-option');
const emailGroup = document.getElementById('email-group');
const idGroup = document.getElementById('id-group');
const loginType = document.getElementById('login-type');

loginOptions.forEach(option => {
    option.addEventListener('click', () => {
        loginOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        if (option.id === 'email-login') {
            emailGroup.style.display = 'block';
            idGroup.style.display = 'none';
            loginType.value = 'email';
        } else {
            emailGroup.style.display = 'none';
            idGroup.style.display = 'block';
            loginType.value = 'id';
        }
    });
});