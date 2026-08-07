import os
import sys

# Add the parent directory to sys.path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db

app = create_app('development')

def init_db():
    with app.app_context():
        # Create all tables
        db.create_all()
        print("Database initialized successfully.")
        
        # Optionally create a default test user
        from app.models.auth import User
        if not User.query.filter_by(email="test@example.com").first():
            user = User(email="test@example.com", first_name="Test", last_name="User")
            user.set_password("password123")
            db.session.add(user)
            
            # Create a mock project and conversation
            from app.models.core import Project, Conversation
            proj = Project(name="Default Project", owner=user)
            db.session.add(proj)
            db.session.flush() # get ID
            
            conv = Conversation(title="First Chat", project=proj)
            db.session.add(conv)
            
            db.session.commit()
            print("Created default user: test@example.com / password123")

if __name__ == "__main__":
    init_db()
