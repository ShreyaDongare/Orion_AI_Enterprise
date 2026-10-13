from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)

from app.schemas.api_schemas import (
    UserRegistrationSchema,
    UserLoginSchema,
    TokenSchema,
    ErrorResponseSchema,
)

from app.models.auth import User
from app.extensions import db


# ============================================================
# AUTH BLUEPRINT
# ============================================================

blp = Blueprint(
    "auth",
    "auth",
    url_prefix="/api/v1/auth",
    description="Authentication operations",
)


# ============================================================
# REGISTER
# ============================================================

@blp.route("/register")
class Register(MethodView):

    @blp.arguments(UserRegistrationSchema)
    @blp.response(201, TokenSchema)
    @blp.alt_response(
        400,
        schema=ErrorResponseSchema
    )
    def post(
        self,
        user_data
    ):

        # ----------------------------------------------------
        # Check existing user
        # ----------------------------------------------------

        existing_user = (
            User.query
            .filter_by(
                email=user_data["email"]
            )
            .first()
        )

        if existing_user:

            abort(
                400,
                message="User already exists."
            )

        # ----------------------------------------------------
        # Create user
        # ----------------------------------------------------

        try:

            user = User(
                email=user_data["email"],
                first_name=user_data.get(
                    "first_name",
                    ""
                ),
                last_name=user_data.get(
                    "last_name",
                    ""
                ),
            )

            user.set_password(
                user_data["password"]
            )

            db.session.add(
                user
            )

            db.session.commit()

        except Exception:

            db.session.rollback()

            abort(
                500,
                message="Failed to create user."
            )

        # ----------------------------------------------------
        # Generate tokens
        # ----------------------------------------------------

        access_token = (
            create_access_token(
                identity=str(user.id)
            )
        )

        refresh_token = (
            create_refresh_token(
                identity=str(user.id)
            )
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }


# ============================================================
# LOGIN
# ============================================================

@blp.route("/login")
class Login(MethodView):

    @blp.arguments(UserLoginSchema)
    @blp.response(200, TokenSchema)
    @blp.alt_response(
        401,
        schema=ErrorResponseSchema
    )
    def post(
        self,
        user_data
    ):

        user = (
            User.query
            .filter_by(
                email=user_data["email"]
            )
            .first()
        )

        if not user:

            abort(
                401,
                message="Invalid email or password."
            )

        if not user.check_password(
            user_data["password"]
        ):

            abort(
                401,
                message="Invalid email or password."
            )

        # ----------------------------------------------------
        # Generate tokens
        # ----------------------------------------------------

        access_token = (
            create_access_token(
                identity=str(user.id)
            )
        )

        refresh_token = (
            create_refresh_token(
                identity=str(user.id)
            )
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }


# ============================================================
# REFRESH ACCESS TOKEN
# ============================================================

@blp.route("/refresh")
class RefreshToken(MethodView):

    @jwt_required(
        refresh=True
    )
    @blp.response(200, TokenSchema)
    @blp.alt_response(
        401,
        schema=ErrorResponseSchema
    )
    def post(
        self
    ):

        # ----------------------------------------------------
        # Get identity from refresh token
        # ----------------------------------------------------

        identity = get_jwt_identity()

        if not identity:

            abort(
                401,
                message="Invalid refresh token."
            )

        # ----------------------------------------------------
        # Verify token type
        # ----------------------------------------------------

        jwt_data = get_jwt()

        if jwt_data.get(
            "type"
        ) != "refresh":

            abort(
                401,
                message="Refresh token required."
            )

        # ----------------------------------------------------
        # Verify user still exists
        # ----------------------------------------------------

        try:

            user_uuid = str(
                identity
            )

            user = (
                User.query
                .filter_by(
                    id=user_uuid
                )
                .first()
            )

        except Exception:

            user = None

        if not user:

            abort(
                401,
                message="User no longer exists."
            )

        # ----------------------------------------------------
        # Generate new access token
        # ----------------------------------------------------

        access_token = (
            create_access_token(
                identity=str(user.id)
            )
        )

        # ----------------------------------------------------
        # Return token
        # ----------------------------------------------------

        return {
            "access_token": access_token,
        }


# ============================================================
# CURRENT USER
# ============================================================

@blp.route("/me")
class CurrentUser(MethodView):

    @jwt_required()
    def get(
        self
    ):

        identity = get_jwt_identity()

        if not identity:

            abort(
                401,
                message="Authentication required."
            )

        try:

            user = (
                User.query
                .filter_by(
                    id=str(identity)
                )
                .first()
            )

        except Exception:

            user = None

        if not user:

            abort(
                404,
                message="User not found."
            )

        role_names = [
            assignment.role.name
            for assignment in (user.roles or [])
            if assignment.role is not None
        ]

        return {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "role": role_names[0] if role_names else "User",
        }