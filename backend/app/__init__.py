import os

from flask import Flask, jsonify

from app.config import config_by_name
from app.extensions import (
    db,
    migrate,
    jwt,
    api,
    cors,
)


def create_app(config_name=None):

    # ========================================================
    # CONFIGURATION
    # ========================================================

    if config_name is None:
        config_name = os.getenv(
            "FLASK_ENV",
            "development",
        )

    app = Flask(__name__)

    app.config.from_object(
        config_by_name[config_name]
    )

    # ========================================================
    # INITIALIZE EXTENSIONS
    # ========================================================

    db.init_app(app)

    migrate.init_app(
        app,
        db,
    )

    jwt.init_app(app)

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": "*"
            }
        },
    )

    api.init_app(app)

    # ========================================================
    # STORAGE
    # ========================================================

    os.makedirs(
        app.config["STORAGE_PATH"],
        exist_ok=True,
    )

    # ========================================================
    # REGISTER BLUEPRINTS
    # ========================================================

    from app.routes import (
        AuthBlueprint,
        ChatBlueprint,
        KnowledgeBlueprint,
        ProjectsBlueprint,
        ReportsBlueprint,
        PresentationBlueprint,
        EmailsBlueprint,
        AnalyticsBlueprint,
    )

    api.register_blueprint(
        AuthBlueprint
    )

    api.register_blueprint(
        ChatBlueprint
    )

    api.register_blueprint(
        KnowledgeBlueprint
    )

    api.register_blueprint(
        ProjectsBlueprint
    )

    api.register_blueprint(
        ReportsBlueprint
    )

    api.register_blueprint(
        PresentationBlueprint
    )

    api.register_blueprint(
        EmailsBlueprint
    )

    api.register_blueprint(
        AnalyticsBlueprint
    )

    # ========================================================
    # HEALTH CHECK
    # ========================================================

    @app.route(
        "/health",
        methods=["GET"],
    )
    def health_check():

        return jsonify({
            "status": "healthy"
        }), 200

    return app