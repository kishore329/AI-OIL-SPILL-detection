"""
Module 24 — Oil Spill AI Assistant API Router.
Endpoints for processing conversational assistant queries, retrieving grounded reasoning,
accessing conversation history, and managing operator chat sessions.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.assistant import AssistantConversation, AssistantMessage
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantMessageSchema,
    AssistantConversationResponse,
    AssistantConversationListItem,
)
from app.services.assistant_service import AIAssistantService

router = APIRouter(prefix="/assistant", tags=["Oil Spill AI Assistant"])


@router.post("/chat", response_model=AssistantChatResponse, status_code=status.HTTP_200_OK)
def assistant_chat(
    payload: AssistantChatRequest,
    db: Session = Depends(get_db),
):
    """
    Processes an operator query using grounded read-only application data.
    Enforces zero hallucination, source attribution citations, and safety policies.
    """
    conv, msg, followups = AIAssistantService.process_chat(
        user_message=payload.message,
        db=db,
        conversation_id=payload.conversation_id,
        incident_id=payload.incident_id,
    )

    return AssistantChatResponse(
        conversation_id=conv.id,
        message=AssistantMessageSchema.model_validate(msg),
        suggested_followups=followups,
    )


@router.get("/conversations", response_model=list[AssistantConversationListItem])
def list_conversations(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Lists past operator conversation sessions."""
    conversations = (
        db.query(AssistantConversation)
        .order_by(desc(AssistantConversation.updated_at))
        .limit(limit)
        .all()
    )

    items = []
    for c in conversations:
        items.append(
            AssistantConversationListItem(
                id=c.id,
                title=c.title,
                incident_id=c.incident_id,
                message_count=len(c.messages),
                updated_at=c.updated_at,
            )
        )
    return items


@router.get("/conversations/{conversation_id}", response_model=AssistantConversationResponse)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
):
    """Retrieves full conversation session and message history."""
    conv = db.query(AssistantConversation).filter(AssistantConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )

    return AssistantConversationResponse(
        id=conv.id,
        title=conv.title,
        incident_id=conv.incident_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[AssistantMessageSchema.model_validate(m) for m in conv.messages],
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
):
    """Clears and deletes an operator conversation session."""
    conv = db.query(AssistantConversation).filter(AssistantConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found",
        )

    db.delete(conv)
    db.commit()
    return {"status": "deleted", "id": conversation_id}
