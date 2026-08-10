from app.routes.auth import blp as AuthBlueprint
from app.routes.chat import blp as ChatBlueprint
from app.routes.knowledge import blp as KnowledgeBlueprint
from app.routes.projects import blp as ProjectsBlueprint
from app.routes.reports import blp as ReportsBlueprint
from app.routes.presentations import blp as PresentationBlueprint
from app.routes.emails import blp as EmailsBlueprint


__all__ = [
    "AuthBlueprint",
    "ChatBlueprint",
    "KnowledgeBlueprint",
    "ProjectsBlueprint",
    "ReportsBlueprint",
    "PresentationBlueprint",
    "EmailsBlueprint",
]