// Управление моими объявлениями
document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(localStorage.getItem('telegram_user') || '{}');
    const postsContainer = document.getElementById('postsContainer');
    const userAlert = document.getElementById('userAlert');

    if (!userData.id) {
        userAlert.style.display = 'block';
        postsContainer.innerHTML = '<p>Необходима авторизация через Telegram</p>';
        return;
    }

    loadUserPosts(userData.id);
});

async function loadUserPosts(telegramId) {
    try {
        const response = await fetch(`/api/user/${telegramId}/posts`);
        const data = await response.json();

        console.log('Отладочная информация:', data);

        const postsContainer = document.getElementById('postsContainer');

        if (data.posts && data.posts.length > 0) {
            let html = '';
            data.posts.forEach(post => {
                console.log('Пост:', post);
                html += `
                    <div class="post-card">
                        <h3>${post.title}</h3>
                        <p class="post-meta">
                            📍 ${post.category_display} • ${post.created_at_display}
                            ${post.price ? ` • 💰 ${post.price}` : ''}
                            ${post.reviews_count > 0 ? ` • ⭐ ${post.average_rating} (${post.reviews_count})` : ' • ⭐ Нет отзывов'}
                        </p>
                        <p>${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
                        <div class="post-actions">
                            <a href="/post/${post.id}" class="btn btn-small">👁️ Просмотреть</a>
                            <a href="/edit_post/${post.id}" class="btn btn-small">✏️ Редактировать</a>
                            <span class="post-status ${post.is_active ? 'active' : 'inactive'}">
                                ${post.is_active ? '✅ Активно' : '❌ Неактивно'}
                            </span>
                        </div>
                    </div>
                `;
            });
            postsContainer.innerHTML = html;
        } else {
            postsContainer.innerHTML = `
                <div class="no-posts">
                    <p>У вас пока нет объявлений.</p>
                    <a href="{{ url_for('create_post') }}" class="btn btn-primary">Создать первое объявление</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading user posts:', error);
        document.getElementById('postsContainer').innerHTML = '<p>Ошибка при загрузке объявлений</p>';
    }
}