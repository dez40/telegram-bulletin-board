// Профиль пользователя
function openTab(tabName) {
    // Скрыть все табы
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }

    // Убрать активный класс со всех кнопок
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }

    // Показать выбранный таб и активировать кнопку
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('User profile page loaded');

    // Активируем первую вкладку по умолчанию
    const firstTab = document.querySelector('.tab-button');
    if (firstTab) {
        firstTab.click();
    }
});