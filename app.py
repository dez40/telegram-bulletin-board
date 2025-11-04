from flask import Flask, render_template, request, jsonify, redirect, url_for
from models import db, User, Post, Review
from config import Config
import requests
import json

app = Flask(__name__)
app.config.from_object(Config)

# Инициализация базы данных ДОЛЖНА быть ПОСЛЕ создания app
db.init_app(app)

# Создание таблиц должно быть внутри app context
with app.app_context():
    db.create_all()


def init_telegram_webapp():
    """Инициализация Telegram Web App"""
    return """
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script>
        let tg = window.Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();

        // Получаем данные пользователя
        const user = tg.initDataUnsafe.user;

        // Сохраняем в localStorage для использования в приложении
        if (user) {
            localStorage.setItem('telegram_user', JSON.stringify(user));
        }

        // Функция для показа уведомлений
        function showNotification(message, type = 'info') {
            if (tg && tg.showPopup) {
                tg.showPopup({
                    title: type === 'error' ? 'Ошибка' : 'Уведомление',
                    message: message,
                    buttons: [{ type: 'ok' }]
                });
            } else {
                alert(message);
            }
        }

        // Сохраняем функцию в глобальной области видимости
        window.showTelegramNotification = showNotification;
    </script>
    """


@app.route('/')
def index():
    """Главная страница с последними объявлениями"""
    telegram_init = init_telegram_webapp()
    posts = Post.query.filter_by(is_active=True).order_by(Post.created_at.desc()).limit(10).all()
    return render_template('index.html', posts=posts, telegram_init=telegram_init, categories=Post.CATEGORIES)


@app.route('/posts')
def posts():
    """Страница со всеми объявлениями с пагинацией"""
    category = request.args.get('category', '')
    page = request.args.get('page', 1, type=int)

    query = Post.query.filter_by(is_active=True)

    if category:
        query = query.filter_by(category=category)

    posts_pagination = query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    return render_template('posts.html',
                           posts=posts_pagination,
                           categories=Post.CATEGORIES,
                           current_category=category)


@app.route('/post/<post_id>')
def post_detail(post_id):
    """Страница детального просмотра объявления"""
    post = Post.query.get_or_404(post_id)

    # Если пост неактивен, показываем 404 (кроме автора)
    if not post.is_active:
        return render_template('404.html'), 404

    # Получаем отзывы для этого объявления
    reviews = Review.query.filter_by(post_id=post_id).order_by(Review.created_at.desc()).all()

    # Проверяем, может ли текущий пользователь оставить отзыв
    can_review = False
    user_data = None

    try:
        user_data_json = request.args.get('user_data') or '{}'
        user_data = json.loads(user_data_json)
        if user_data and user_data.get('id'):
            # Находим пользователя в базе
            buyer = User.query.filter_by(telegram_id=user_data['id']).first()
            if buyer:
                # Проверяем, не оставлял ли уже пользователь отзыв на это объявление
                existing_review = Review.query.filter_by(
                    post_id=post_id,
                    buyer_id=buyer.id
                ).first()
                can_review = not existing_review and user_data['id'] != post.author.telegram_id
    except:
        pass

    return render_template('post_detail.html',
                           post=post,
                           reviews=reviews,
                           can_review=can_review,
                           user_data=user_data)


@app.route('/create', methods=['GET', 'POST'])
def create_post():
    """Создание нового объявления"""
    if request.method == 'POST':
        try:
            # Получаем данные пользователя из Telegram
            user_data = request.json.get('user_data')

            print(f"Received user data: {user_data}")  # Для отладки

            if not user_data or not user_data.get('id'):
                return jsonify({
                    'success': False,
                    'error': 'Данные пользователя не найдены. Пожалуйста, откройте приложение через Telegram.'
                })

            # Валидация обязательных полей
            required_fields = ['title', 'content', 'category', 'contact_info']
            for field in required_fields:
                if not request.json.get(field):
                    return jsonify({
                        'success': False,
                        'error': f'Поле "{field}" обязательно для заполнения'
                    })

            # Находим или создаем пользователя
            user = User.query.filter_by(telegram_id=user_data['id']).first()
            if not user:
                user = User(
                    telegram_id=user_data['id'],
                    username=user_data.get('username'),
                    first_name=user_data.get('first_name'),
                    last_name=user_data.get('last_name')
                )
                db.session.add(user)
                db.session.commit()

            # Создаем объявление
            post = Post(
                title=request.json['title'].strip(),
                content=request.json['content'].strip(),
                category=request.json['category'],
                price=request.json.get('price', '').strip(),
                contact_info=request.json['contact_info'].strip(),
                user_id=user.id
            )

            db.session.add(post)
            db.session.commit()

            return jsonify({
                'success': True,
                'post_id': post.id,
                'message': 'Объявление успешно опубликовано!'
            })

        except Exception as e:
            db.session.rollback()
            print(f"Error creating post: {str(e)}")  # Для отладки
            return jsonify({
                'success': False,
                'error': f'Ошибка при создании объявления: {str(e)}'
            })

    return render_template('create_post.html', categories=Post.CATEGORIES)


@app.route('/api/review', methods=['POST'])
def add_review():
    """Добавление отзыва к объявлению"""
    try:
        data = request.json
        post_id = data.get('post_id')
        rating = data.get('rating')
        comment = data.get('comment', '').strip()
        user_data = data.get('user_data')

        if not user_data or not user_data.get('id'):
            return jsonify({
                'success': False,
                'error': 'Необходима авторизация через Telegram'
            })

        # Проверяем обязательные поля
        if not all([post_id, rating]):
            return jsonify({
                'success': False,
                'error': 'Заполните все обязательные поля'
            })

        # Проверяем, существует ли объявление
        post = Post.query.get(post_id)
        if not post:
            return jsonify({
                'success': False,
                'error': 'Объявление не найдено'
            })

        # Находим или создаем пользователя (покупателя)
        buyer = User.query.filter_by(telegram_id=user_data['id']).first()
        if not buyer:
            buyer = User(
                telegram_id=user_data['id'],
                username=user_data.get('username'),
                first_name=user_data.get('first_name'),
                last_name=user_data.get('last_name')
            )
            db.session.add(buyer)
            db.session.commit()

        # Нельзя оставлять отзыв на свое объявление
        if buyer.id == post.user_id:
            return jsonify({
                'success': False,
                'error': 'Нельзя оставлять отзыв на свое объявление'
            })

        # Проверяем, не оставлял ли уже пользователь отзыв
        existing_review = Review.query.filter_by(
            post_id=post_id,
            buyer_id=buyer.id
        ).first()

        if existing_review:
            return jsonify({
                'success': False,
                'error': 'Вы уже оставляли отзыв на это объявление'
            })

        # Проверяем корректность рейтинга
        if not (1 <= int(rating) <= 5):
            return jsonify({
                'success': False,
                'error': 'Рейтинг должен быть от 1 до 5'
            })

        # Создаем отзыв
        review = Review(
            rating=int(rating),
            comment=comment,
            buyer_id=buyer.id,
            seller_id=post.user_id,  # автор объявления
            post_id=post_id
        )

        db.session.add(review)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Отзыв успешно добавлен!',
            'review_id': review.id
        })

    except Exception as e:
        db.session.rollback()
        print(f"Error adding review: {str(e)}")  # Для отладки
        return jsonify({
            'success': False,
            'error': f'Ошибка при добавлении отзыва: {str(e)}'
        })


@app.route('/api/user/<telegram_id>/reviews')
def get_user_reviews(telegram_id):
    """Получение отзывов пользователя"""
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({'reviews': []})

    reviews = Review.query.filter_by(seller_id=user.id).order_by(Review.created_at.desc()).all()

    reviews_data = []
    for review in reviews:
        reviews_data.append({
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at.strftime('%d.%m.%Y'),
            'buyer_name': review.buyer.first_name,
            'buyer_username': f"@{review.buyer.username}" if review.buyer.username else None,
            'post_title': review.post.title
        })

    return jsonify({
        'reviews': reviews_data,
        'average_rating': user.average_rating,
        'total_reviews': user.reviews_count
    })


@app.route('/api/user/<telegram_id>/posts')
def get_user_posts(telegram_id):
    """Получение объявлений пользователя"""
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({'posts': []})

    posts = Post.query.filter_by(user_id=user.id).order_by(Post.created_at.desc()).all()

    posts_data = []
    for post in posts:
        author = post.author  # Получаем автора
        posts_data.append({
            'id': post.id,
            'title': post.title,
            'content': post.content,
            'category': post.category,
            'category_display': dict(Post.CATEGORIES).get(post.category, post.category),
            'price': post.price,
            'contact_info': post.contact_info,
            'created_at': post.created_at.isoformat(),
            'created_at_display': post.created_at.strftime('%d.%m.%Y в %H:%M'),
            'is_active': post.is_active,
            'average_rating': author.average_rating if author else 0,
            'reviews_count': author.reviews_count if author else 0
        })

    return jsonify({'posts': posts_data})


@app.route('/my_posts')
def my_posts():
    """Страница с объявлениями текущего пользователя"""
    return render_template('my_posts.html', categories=Post.CATEGORIES)


@app.route('/api/posts')
def api_posts():
    """API endpoint для получения объявлений (для AJAX)"""
    category = request.args.get('category', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = Post.query.filter_by(is_active=True)

    if category:
        query = query.filter_by(category=category)

    posts = query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    posts_data = []
    for post in posts.items:
        posts_data.append({
            'id': post.id,
            'title': post.title,
            'content': post.content,
            'category': post.category,
            'category_display': dict(Post.CATEGORIES).get(post.category, post.category),
            'price': post.price,
            'contact_info': post.contact_info,
            'created_at': post.created_at.isoformat(),
            'created_at_display': post.created_at.strftime('%d.%m.%Y в %H:%M'),
            'author': post.author.first_name if post.author else 'Аноним',
            'author_username': f"@{post.author.username}" if post.author and post.author.username else None,
            'author_rating': post.author.average_rating if post.author else 0,
            'author_reviews_count': post.author.reviews_count if post.author else 0
        })

    return jsonify({
        'posts': posts_data,
        'has_next': posts.has_next,
        'has_prev': posts.has_prev,
        'page': posts.page,
        'pages': posts.pages,
        'total': posts.total
    })


@app.route('/api/categories')
def api_categories():
    """API endpoint для получения категорий"""
    categories = [{'value': value, 'label': label} for value, label in Post.CATEGORIES]
    return jsonify({'categories': categories})


@app.route('/search')
def search_posts():
    """Поиск объявлений"""
    query = request.args.get('q', '')
    category = request.args.get('category', '')
    page = request.args.get('page', 1, type=int)

    search_query = Post.query.filter_by(is_active=True)

    if query:
        search_query = search_query.filter(
            db.or_(
                Post.title.ilike(f'%{query}%'),
                Post.content.ilike(f'%{query}%')
            )
        )

    if category:
        search_query = search_query.filter_by(category=category)

    posts = search_query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    return render_template('search.html',
                           posts=posts,
                           categories=Post.CATEGORIES,
                           search_query=query,
                           current_category=category)


@app.route('/home')
def home():
    """Редирект на главную страницу"""
    return redirect(url_for('index'))


@app.route('/about')
def about():
    """Страница о приложении"""
    return render_template('about.html')


@app.errorhandler(404)
def not_found_error(error):
    """Обработчик 404 ошибки"""
    return render_template('404.html'), 404


@app.errorhandler(500)
def internal_error(error):
    """Обработчик 500 ошибки"""
    db.session.rollback()
    return render_template('500.html'), 500


# Команды для управления приложением
@app.cli.command('init-db')
def init_db_command():
    """Инициализация базы данных"""
    with app.app_context():
        db.create_all()
    print('База данных инициализирована.')


@app.cli.command('clear-posts')
def clear_posts_command():
    """Очистка всех объявлений"""
    with app.app_context():
        Post.query.delete()
        db.session.commit()
    print('Все объявления удалены.')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)