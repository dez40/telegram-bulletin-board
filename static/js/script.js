// Инициализация Telegram Web App
function initTelegramApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;

        // Раскрываем на весь экран
        tg.expand();

        // Устанавливаем цвет фона
        tg.setBackgroundColor('#667eea');

        // Обработка основной кнопки
        const mainButton = tg.MainButton;

        // Показываем данные пользователя
        const user = tg.initDataUnsafe.user;
        if (user) {
            console.log('Telegram user:', user);
        }

        return tg;
    }
    return null;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const tg = initTelegramApp();

    // Добавляем обработчики для всех кнопок
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });
});

// Функция для загрузки объявлений
async function loadPosts(category = '', page = 1) {
    try {
        const response = await fetch(`/api/posts?category=${category}&page=${page}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading posts:', error);
        return { posts: [], has_next: false, has_prev: false };
    }
}