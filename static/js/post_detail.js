// Детальная страница объявления
document.addEventListener('DOMContentLoaded', function() {
    const reviewForm = document.getElementById('reviewForm');
    console.log('Review form found:', !!reviewForm);

    if (reviewForm) {
        // Обработка выбора звезд
        const stars = reviewForm.querySelectorAll('input[name="rating"]');
        const starLabels = reviewForm.querySelectorAll('input[name="rating"] + label');

        // Инициализация цвета звезд по умолчанию
        starLabels.forEach(star => {
            star.style.color = '#ccc';
        });

        stars.forEach(star => {
            star.addEventListener('change', function() {
                console.log('Star selected:', this.value);
                // Обновляем визуальное отображение выбранных звезд
                const rating = parseInt(this.value);
                stars.forEach((s, index) => {
                    const label = s.nextElementSibling;
                    if (parseInt(s.value) <= rating) {
                        label.style.color = '#ffc107';
                    } else {
                        label.style.color = '#ccc';
                    }
                });
            });
        });

        reviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Form submitted');

            const formData = new FormData(this);
            const rating = formData.get('rating');
            const comment = formData.get('comment');
            const postId = formData.get('post_id');

            console.log('Form data:', { rating, comment, postId });

            if (!rating) {
                alert('Пожалуйста, поставьте оценку');
                return;
            }

            // Получаем данные пользователя из localStorage
            const userData = JSON.parse(localStorage.getItem('telegram_user') || '{}');
            console.log('User data from localStorage:', userData);

            if (!userData.id) {
                alert('Для оставления отзыва необходимо авторизоваться через Telegram. Пожалуйста, откройте приложение через Telegram бота.');
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправка...';
            submitBtn.classList.add('loading');

            try {
                console.log('Sending review request...');

                const response = await fetch('/api/review', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        post_id: postId,
                        rating: parseInt(rating),
                        comment: comment,
                        user_data: userData
                    })
                });

                const result = await response.json();
                console.log('Server response:', result);

                if (result.success) {
                    const message = result.needs_moderation
                        ? 'Отзыв отправлен на модерацию! Он появится после проверки администратором.'
                        : 'Отзыв успешно добавлен!';

                    if (window.showTelegramNotification) {
                        window.showTelegramNotification(message, 'info');
                    } else {
                        alert(message);
                    }

                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Review submission error:', error);
                const errorMsg = 'Ошибка при отправке отзыва: ' + error.message;

                if (window.showTelegramNotification) {
                    window.showTelegramNotification(errorMsg, 'error');
                } else {
                    alert(errorMsg);
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.classList.remove('loading');
            }
        });
    } else {
        console.log('No review form found on this page');
    }

    // Debug: проверяем данные пользователя
    const userData = JSON.parse(localStorage.getItem('telegram_user') || '{}');
    console.log('Current user data:', userData);
});