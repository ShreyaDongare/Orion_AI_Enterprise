from typing import List, Dict, Any
from app.models.core import Message
from app.extensions import db
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage

class ConversationMemory:
    """Retrieves and formats conversation history from the database."""
    
    @staticmethod
    def get_history(conversation_id: str, limit: int = 10) -> List[BaseMessage]:
        """
        Fetches the last N messages for a conversation and converts them 
        into LangChain message objects.
        """
        messages = Message.query.filter_by(conversation_id=conversation_id)\
                                .order_by(Message.created_at.desc())\
                                .limit(limit)\
                                .all()
        
        # Reverse to chronological order
        messages.reverse()
        
        langchain_messages = []
        for msg in messages:
            if msg.role == 'user':
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == 'assistant':
                langchain_messages.append(AIMessage(content=msg.content))
            elif msg.role == 'system':
                langchain_messages.append(SystemMessage(content=msg.content))
                
        return langchain_messages

    @staticmethod
    def save_message(conversation_id: str, role: str, content: str, agent_type: str = None) -> Message:
        """Saves a message to the database."""
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            agent_type=agent_type
        )
        db.session.add(msg)
        db.session.commit()
        return msg
