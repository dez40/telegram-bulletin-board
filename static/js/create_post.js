// Создание нового объявления
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('postForm');
    const userAlert = document.getElementById('userAlert');

    // Проверяем наличие данных пользователя
    const userData = JSON.parse(localStorage.getItem('telegram_user') || '{}');
    if (!userData.id) {
        userAlert.style.display = 'block';
        form.style.opacity = '0.5';
        const formElements = form.querySelectorAll('input, select, textarea, button');
        formElements.forEach(element => {
            element.disabled = true;
        });
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Публикуем...';

        try {
            const formData = new FormData(this);

            const response = await fetch('/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: formData.get('title'),
                    category: formData.get('category'),
                    content: formData.get('content'),
                    price: formData.get('price'),
                    contact_info: formData.get('contact_info'),
                    user_data: userData
                })
            });

            const result = await response.json();

            if (result.success) {
                if (window.showTelegramNotification) {
                    window.showTelegramNotification(result.message, 'info');
                } else {
                    alert(result.message);
                }
                setTimeout(() => {
                    window.location.href = '/post/' + result.post_id;
                }, 1000);
            } else {
                const errorMsg = result.error || 'Неизвестная ошибка';
                if (window.showTelegramNotification) {
                    window.showTelegramNotification(errorMsg, 'error');
                } else {
                    alert('Ошибка при публикации: ' + errorMsg);
                }
            }
        } catch (error) {
            const errorMsg = 'Ошибка сети: ' + error.message;
            if (window.showTelegramNotification) {
                window.showTelegramNotification(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});