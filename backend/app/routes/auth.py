from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.schemas.api_schemas import UserRegistrationSchema, UserLoginSchema, TokenSchema, ErrorResponseSchema
from app.models.auth import User
from app.extensions import db

blp = Blueprint("auth", "auth", url_prefix="/api/v1/auth", description="Authentication operations")

@blp.route("/register")
class Register(MethodView):
    @blp.arguments(UserRegistrationSchema)
    @blp.response(201, TokenSchema)
    @blp.alt_response(400, schema=ErrorResponseSchema)
    def post(self, user_data):
        if User.query.filter_by(email=user_data["email"]).first():
            abort(400, message="User already exists.")
            
        user = User(
            email=user_data["email"],
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", "")
        )
        user.set_password(user_data["password"])
        db.session.add(user)
        db.session.commit()
        
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return {"access_token": access_token, "refresh_token": refresh_token}

@blp.route("/login")
class Login(MethodView):
    @blp.arguments(UserLoginSchema)
    @blp.response(200, TokenSchema)
    @blp.alt_response(401, schema=ErrorResponseSchema)
    def post(self, user_data):
        user = User.query.filter_by(email=user_data["email"]).first()
        if user and user.check_password(user_data["password"]):
            access_token = create_access_token(identity=str(user.id))
            refresh_token = create_refresh_token(identity=str(user.id))
            return {"access_token": access_token, "refresh_token": refresh_token}
            
        abort(401, message="Invalid email or password.")
