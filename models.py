from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.BigInteger, unique=True, nullable=False, index=True)  # Добавлен индекс
    username = db.Column(db.String(80))
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    posts = db.relationship('Post', backref='author', lazy=True)

    # Исправленные отношения
    reviews_received = db.relationship('Review',
                                       foreign_keys='Review.seller_id',
                                       backref='seller',
                                       lazy=True)
    reviews_given = db.relationship('Review',
                                    foreign_keys='Review.buyer_id',
                                    backref='buyer',
                                    lazy=True)

    @property
    def average_rating(self):
        reviews = Review.query.filter_by(seller_id=self.id).all()
        if not reviews:
            return 0
        total = sum(review.rating for review in reviews)
        return round(total / len(reviews), 1)

    @property
    def reviews_count(self):
        return Review.query.filter_by(seller_id=self.id).count()


class Post(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.String(50))
    contact_info = db.Column(db.String(200))
    image_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    reviews = db.relationship('Review', backref='post', lazy=True)

    CATEGORIES = [
        ('услуги', 'Услуги'),
        ('продажа', 'Продажа'),
        ('даром', 'Отдам даром'),
        ('поиск', 'Ищу'),
        ('инфо', 'Информация'),
        ('другое', 'Другое')
    ]

    @property
    def average_rating(self):
        if not self.reviews:
            return 0
        return sum(review.rating for review in self.reviews) / len(self.reviews)

    @property
    def reviews_count(self):
        return len(self.reviews)


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Кто оставил отзыв (покупатель)
    buyer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Кому оставлен отзыв (продавец)
    seller_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # На какое объявление отзыв
    post_id = db.Column(db.String(36), db.ForeignKey('post.id'), nullable=False)

    # Уникальность: один пользователь может оставить только один отзыв на объявление
    __table_args__ = (db.UniqueConstraint('buyer_id', 'post_id', name='unique_review_per_buyer_post'),)
