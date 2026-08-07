import os
from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, migrate, jwt, api, cors

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    api.init_app(app)

    # Make sure storage path exists
    os.makedirs(app.config['STORAGE_PATH'], exist_ok=True)

    # Register blueprints
    from app.routes import AuthBlueprint, ChatBlueprint
    api.register_blueprint(AuthBlueprint)
    api.register_blueprint(ChatBlueprint)

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    return app
