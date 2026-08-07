from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required
from app.schemas.api_schemas import ChatRequestSchema, ChatResponseSchema, ErrorResponseSchema
from app.agents.workflow_orchestrator import workflow_orchestrator
from app.agents.memory import ConversationMemory
from app.models.core import Conversation, Project
from app.extensions import db

blp = Blueprint("chat", "chat", url_prefix="/api/v1/chat", description="Chat operations")

@blp.route("/message")
class ChatMessage(MethodView):
    @blp.arguments(ChatRequestSchema)
    @blp.response(200, ChatResponseSchema)
    @blp.alt_response(500, schema=ErrorResponseSchema)
    # @jwt_required() # Disabled for easy local testing initially
    def post(self, chat_data):
        conversation_id = chat_data["conversation_id"]
        input_text = chat_data["message"]
        
        # Verify conversation exists or create mock
        conv = Conversation.query.get(conversation_id)
        if not conv:
            # For testing without a full project flow, just create a dummy project and conversation
            proj = Project.query.first()
            if not proj:
                # We need a user to own it, assuming a test user exists or just bypass for now
                abort(404, message="Conversation not found and no mock project available.")
        
        # Save human message
        ConversationMemory.save_message(conversation_id, "user", input_text)
        
        try:
            # Process via orchestrator
            result = workflow_orchestrator.process_request(input_text, conversation_id)
            
            response_text = result.get("response", "No response generated.")
            agent_used = result.get("agent_used", "unknown")
            
            # Save AI message
            ConversationMemory.save_message(conversation_id, "assistant", response_text, agent_type=agent_used)
            
            return {"response": response_text, "agent_used": agent_used}
        except Exception as e:
            abort(500, message=f"Internal server error processing chat: {str(e)}")
