// Модерация отзывов
async function moderateReview(reviewId, action) {
    const userData = JSON.parse(localStorage.getItem('telegram_user') || '{}');

    if (!userData.id) {
        alert('Требуется авторизация через Telegram');
        return;
    }

    const confirmMessage = action === 'approve'
        ? 'Вы уверены, что хотите одобрить этот отзыв?'
        : 'Вы уверены, что хотите отклонить этот отзыв?';

    if (!confirm(confirmMessage)) {
        return;
    }

    const card = document.querySelector(`[data-review-id="${reviewId}"]`);
    const buttons = card.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    try {
        const response = await fetch(`/api/review/${reviewId}/moderate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: action,
                user_data: userData
            })
        });

        const result = await response.json();

        if (result.success) {
            // Плавно скрываем карточку
            card.style.opacity = '0.5';
            card.style.transform = 'translateX(-100px)';
            setTimeout(() => card.remove(), 300);

            if (window.showTelegramNotification) {
                window.showTelegramNotification(result.message, 'info');
            } else {
                alert(result.message);
            }

            // Обновляем статистику
            updateStats();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Moderation error:', error);
        buttons.forEach(btn => btn.disabled = false);

        if (window.showTelegramNotification) {
            window.showTelegramNotification('Ошибка: ' + error.message, 'error');
        } else {
            alert('Ошибка: ' + error.message);
        }
    }
}

function showReviewDetails(reviewId) {
    const card = document.querySelector(`[data-review-id="${reviewId}"]`);
    const content = card.querySelector('.review-content').innerHTML;

    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('reviewModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

function updateStats() {
    const remainingCards = document.querySelectorAll('.moderation-card').length;
    const statsElement = document.querySelector('.stat-card h3');
    if (statsElement) {
        statsElement.textContent = remainingCards;
    }
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('reviewModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin reviews page loaded');
});