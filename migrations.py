from flask import Flask
from flask_migrate import Migrate
from models import db
import os

def init_migrations(app):
    migrate = Migrate(app, db)
    return migrate