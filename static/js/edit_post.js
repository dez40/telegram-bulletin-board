// Редактирование объявления
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editPostForm');
    const userAlert = document.getElementById('userAlert');
    const postNotFound = document.getElementById('postNotFound');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const deleteBtn = document.getElementById('deleteBtn');
    const postId = document.getElementById('postId').value;

    // Проверяем наличие данных пользователя
    const userData = JSON.parse(localStorage.getItem('telegram_user') || '{}');
    if (!userData.id) {
        userAlert.style.display = 'block';
        loadingSpinner.style.display = 'none';
        return;
    }

    // Загружаем данные объявления
    loadPostData(postId, userData);

    // Счетчики символов
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const titleCount = document.getElementById('titleCount');
    const contentCount = document.getElementById('contentCount');

    titleInput.addEventListener('input', function() {
        titleCount.textContent = this.value.length;
    });

    contentInput.addEventListener('input', function() {
        contentCount.textContent = this.value.length;
    });

    // Обработка отправки формы
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await updatePost(postId, userData);
    });

    // Обработка удаления
    deleteBtn.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите удалить это объявление? Это действие нельзя отменить.')) {
            deletePost(postId, userData);
        }
    });
});

async function loadPostData(postId, userData) {
    try {
        const response = await fetch(`/api/post/${postId}?user_data=${encodeURIComponent(JSON.stringify(userData))}`);
        const result = await response.json();

        if (result.success) {
            const post = result.post;

            // Заполняем форму данными
            document.getElementById('title').value = post.title;
            document.getElementById('category').value = post.category;
            document.getElementById('content').value = post.content;
            document.getElementById('price').value = post.price || '';
            document.getElementById('contact_info').value = post.contact_info;
            document.getElementById('is_active').checked = post.is_active;

            // Обновляем счетчики
            document.getElementById('titleCount').textContent = post.title.length;
            document.getElementById('contentCount').textContent = post.content.length;

            // Показываем форму
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('editPostForm').style.display = 'block';
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error loading post:', error);
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('postNotFound').style.display = 'block';
    }
}

async function updatePost(postId, userData) {
    const form = document.getElementById('editPostForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Сохранение...';
    submitBtn.classList.add('loading');

    try {
        const formData = new FormData(form);

        const response = await fetch(`/api/post/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: formData.get('title'),
                category: formData.get('category'),
                content: formData.get('content'),
                price: formData.get('price'),
                contact_info: formData.get('contact_info'),
                is_active: formData.get('is_active') === 'on',
                user_data: userData
            })
        });

        const result = await response.json();

        if (result.success) {
            const message = 'Объявление успешно обновлено!';
            if (window.showTelegramNotification) {
                window.showTelegramNotification(message, 'info');
            } else {
                alert(message);
            }

            setTimeout(() => {
                window.location.href = '/my_posts';
            }, 1500);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error updating post:', error);
        const errorMsg = 'Ошибка при обновлении: ' + error.message;
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
}

async function deletePost(postId, userData) {
    const deleteBtn = document.getElementById('deleteBtn');
    const originalText = deleteBtn.textContent;

    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Удаление...';
    deleteBtn.classList.add('loading');

    try {
        const response = await fetch(`/api/post/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_data: userData
            })
        });

        const result = await response.json();

        if (result.success) {
            const message = 'Объявление успешно удалено!';
            if (window.showTelegramNotification) {
                window.showTelegramNotification(message, 'info');
            } else {
                alert(message);
            }

            setTimeout(() => {
                window.location.href = '/my_posts';
            }, 1500);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        const errorMsg = 'Ошибка при удалении: ' + error.message;
        if (window.showTelegramNotification) {
            window.showTelegramNotification(errorMsg, 'error');
        } else {
            alert(errorMsg);
        }

        deleteBtn.disabled = false;
        deleteBtn.textContent = originalText;
        deleteBtn.classList.remove('loading');
    }
}