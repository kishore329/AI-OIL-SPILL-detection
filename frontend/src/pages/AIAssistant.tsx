import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  Bot,
  Send,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  MapPin,
  ShieldAlert,
  ChevronRight,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import apiService from "../services/api";
import type {
  AssistantMessageItem,
  AssistantConversationListItem,
  IncidentDetail,
} from "../types";

const SUGGESTED_PROMPTS = [
  "Which incident has the highest priority?",
  "Why is the top spill critical?",
  "Which coastal areas and fishing zones are at risk?",
  "Which response vessels should be mobilized?",
  "What cleanup strategy is recommended?",
  "What is the modeled economic damage?",
  "How long will the ecosystem take to recover?",
  "Show active smart alerts and restrictions",
];

export default function AIAssistant() {
  const [searchParams] = useSearchParams();
  const initialIncidentId = searchParams.get("incidentId") || "";

  // Chat State
  const [messages, setMessages] = useState<AssistantMessageItem[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AssistantConversationListItem[]>([]);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);

  // Incident Context
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(initialIncidentId);
  const [incidents, setIncidents] = useState<IncidentDetail[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    loadIncidents();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const list = await apiService.getAssistantConversations();
      setConversations(list);
    } catch (e) {
      console.error("Failed loading conversations", e);
    }
  };

  const loadIncidents = async () => {
    try {
      const res = await apiService.getIncidents();
      setIncidents(res.items || []);
    } catch (e) {
      console.error("Failed loading incidents", e);
    }
  };

  const handleSelectConversation = async (id: string) => {
    setLoading(true);
    try {
      const full = await apiService.getAssistantConversationById(id);
      setConversationId(full.id);
      setMessages(full.messages || []);
      setSelectedIncidentId(full.incident_id || "");
      setSuggestedFollowups([]);
    } catch (e) {
      console.error("Failed opening conversation", e);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setSuggestedFollowups([]);
    setSelectedIncidentId("");
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiService.deleteAssistantConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        handleNewConversation();
      }
    } catch (err) {
      console.error("Delete conversation failed", err);
    }
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    setInputQuery("");
    // Optimistic user message
    const tempUserMsg: AssistantMessageItem = {
      id: "temp-" + Date.now(),
      conversation_id: conversationId || "temp",
      role: "user",
      content: textToSend,
      sources: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await apiService.askAssistant({
        message: textToSend,
        conversation_id: conversationId,
        incident_id: selectedIncidentId || undefined,
      });

      setConversationId(res.conversation_id);
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, res.message]);
      setSuggestedFollowups(res.suggested_followups || []);
      loadConversations();
    } catch (err) {
      console.error("Failed asking assistant", err);
      const errorMsg: AssistantMessageItem = {
        id: "err-" + Date.now(),
        conversation_id: conversationId || "temp",
        role: "assistant",
        content: "An operational network error occurred while retrieving platform telemetry. Please verify backend connection.",
        sources: ["Telemetry Gateway Error"],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const activeIncidentObj = incidents.find((i) => i.id === selectedIncidentId);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] gap-4 animate-fade-in">
      {/* Left Sidebar: Session Threads & Context */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 bg-white rounded-2xl border border-[#D9E8F2] p-4 space-y-4 shadow-sm">
        {/* New Chat Button */}
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1268B3] hover:bg-[#0F4C81] text-white text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Query Session</span>
        </button>

        {/* Incident Context Selector */}
        <div className="space-y-1.5 pt-2 border-t border-[#D9E8F2]">
          <label className="text-[10px] font-bold text-[#5E7183] uppercase tracking-wider flex items-center justify-between">
            <span>Incident Context</span>
            {selectedIncidentId && (
              <button
                onClick={() => setSelectedIncidentId("")}
                className="text-[#1268B3] hover:underline text-[9px] lowercase font-normal"
              >
                Clear
              </button>
            )}
          </label>
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="w-full text-xs bg-white border border-[#D9E8F2] rounded-lg px-2.5 py-1.5 text-[#17324D] focus:outline-none focus:border-[#1268B3] shadow-sm"
          >
            <option value="">Global Fleet Scope (All Spills)</option>
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.incident_code} - {inc.severity}
              </option>
            ))}
          </select>
          {activeIncidentObj && (
            <div className="p-2 rounded-lg bg-[#F8FBFE] border border-[#D9E8F2] text-[11px] space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-[#0B3A66]">
                <span>{activeIncidentObj.incident_code}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FFF1F2] text-[#C6283D] border border-[#F5B5BC]">{activeIncidentObj.severity}</span>
              </div>
              <p className="text-[10px] text-[#5E7183] truncate">
                Risk: {activeIncidentObj.risk_score || 0}/100 &bull; Area: {activeIncidentObj.spill_area_km2 || 0} km²
              </p>
            </div>
          )}
        </div>

        {/* Past Sessions List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <div className="text-[10px] font-bold text-[#5E7183] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#1268B3]" />
            <span>Recent Sessions</span>
          </div>
          {conversations.length === 0 ? (
            <p className="text-xs text-[#8A9AA8] italic p-2">No prior chat sessions.</p>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === conversationId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={`group relative p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    isActive
                      ? "bg-[#EAF6FF] border-[#1268B3] text-[#0B3A66] shadow-xs"
                      : "bg-white border-[#D9E8F2] text-[#5E7183] hover:bg-[#F8FBFE] hover:text-[#17324D]"
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold truncate text-[#17324D]">{c.title}</p>
                    <p className="text-[10px] text-[#8A9AA8] font-mono">
                      {c.message_count} msgs &bull; {new Date(c.updated_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-[#5E7183] hover:text-[#C6283D] transition"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Grounding Safety Notice */}
        <div className="p-2.5 rounded-xl bg-[#F8FBFE] border border-[#D9E8F2] text-[10px] text-[#5E7183] space-y-1">
          <p className="font-semibold text-[#17324D] flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-[#087F68]" />
            <span>Zero Hallucination Protocol</span>
          </p>
          <p>Answers synthesized directly from platform telemetry across all 23 modules. Read-only boundary enforced.</p>
        </div>
      </div>

      {/* Main Chat Pane */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-[#D9E8F2] overflow-hidden shadow-sm">
        {/* Chat Pane Header */}
        <div className="px-5 py-3.5 border-b border-[#D9E8F2] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EAF6FF] text-[#1268B3] border border-[#D9E8F2]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#0B3A66] flex items-center gap-2">
                <span>Oil Spill AI Assistant</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[#EAF6FF] text-[#1268B3] border border-[#D9E8F2]">Module 24</span>
              </h1>
              <p className="text-[11px] text-[#5E7183]">
                Grounded conversational copilot across Risk, GIS, Trajectory, Cleanup, and Fleet Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeIncidentObj && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF1F2] border border-[#F5B5BC] text-[#C6283D] text-xs font-mono">
                <span>Scoped: {activeIncidentObj.incident_code}</span>
              </span>
            )}
            <button
              onClick={handleNewConversation}
              className="p-1.5 rounded-lg text-[#5E7183] hover:text-[#17324D] hover:bg-[#F3FAFE] transition"
              title="Clear & start fresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#F8FBFE]">
          {messages.length === 0 ? (
            /* Welcome Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4 py-8">
              <div className="p-4 rounded-2xl bg-white border border-[#D9E8F2] shadow-sm text-[#1268B3]">
                <Bot className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0B3A66]">How can I assist your maritime operations?</h2>
                <p className="text-xs text-[#5E7183] mt-1 leading-relaxed">
                  I analyze live oil spill incidents, assess coastal landfall threats, calculate economic losses, and recommend emergency response assets grounded strictly in platform data.
                </p>
              </div>

              {/* Prompt Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-2.5 text-left rounded-xl bg-white hover:bg-[#EAF6FF] border border-[#D9E8F2] hover:border-[#1268B3] text-xs text-[#17324D] hover:text-[#1268B3] shadow-2xs transition flex items-center justify-between group"
                  >
                    <span className="truncate pr-1 font-medium">{prompt}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#1268B3] shrink-0 group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message List */
            messages.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      isUser
                        ? "bg-[#0B3A66] text-white"
                        : "bg-[#EAF6FF] text-[#1268B3] border border-[#D9E8F2]"
                    }`}
                  >
                    {isUser ? "OP" : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs space-y-2.5 ${
                      isUser
                        ? "bg-[#1268B3] text-white rounded-tr-none shadow-sm"
                        : "bg-white border border-[#D9E8F2] text-[#17324D] rounded-tl-none shadow-sm"
                    }`}
                  >
                    {/* Content */}
                    <div className="leading-relaxed whitespace-pre-line">
                      {msg.content}
                    </div>

                    {/* Incident Card if referenced */}
                    {msg.referenced_incident_id && (
                      <div className="mt-2 p-2.5 rounded-xl bg-[#F8FBFE] border border-[#D9E8F2] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-[#C6283D] shrink-0" />
                          <div>
                            <span className="font-mono font-bold text-[#0B3A66] text-xs">
                              {msg.referenced_incident_code || "INCIDENT"}
                            </span>
                            <span className="text-[10px] text-[#5E7183] ml-2">Active Spill Record</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/incidents/${msg.referenced_incident_id}`}
                            className="px-2 py-1 rounded bg-white hover:bg-[#EAF6FF] text-[10px] font-semibold text-[#1268B3] border border-[#D9E8F2] flex items-center gap-1 transition shadow-xs"
                          >
                            <span>Dossier</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          {msg.referenced_location && (
                            <Link
                              to={`/map?incidentId=${msg.referenced_incident_id}`}
                              className="px-2 py-1 rounded bg-[#E8F8F4] hover:bg-[#D1F2EA] text-[10px] font-semibold text-[#087F68] border border-[#B3E7DA] flex items-center gap-1 transition"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>Map</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Source Attribution Citations */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-[#D9E8F2] flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="text-[#5E7183] font-medium">Grounding Sources:</span>
                        {msg.sources.map((src, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-full bg-[#F4F9FD] border border-[#D9E8F2] text-[#1268B3] font-mono text-[9px]"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#EAF6FF] border border-[#D9E8F2] text-[#1268B3] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-[#D9E8F2] rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-xs text-[#5E7183] shadow-sm">
                <RefreshCw className="w-4 h-4 animate-spin text-[#1268B3]" />
                <span>Synthesizing platform telemetry...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Follow-Ups Bar */}
        {suggestedFollowups.length > 0 && (
          <div className="px-4 py-2 bg-[#F4F9FD] border-t border-[#D9E8F2] flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-[#5E7183] uppercase tracking-wider shrink-0 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-[#1268B3]" />
              <span>Suggested:</span>
            </span>
            {suggestedFollowups.map((q, qIdx) => (
              <button
                key={qIdx}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-[#EAF6FF] border border-[#D9E8F2] text-[#1268B3] hover:text-[#0B3A66] text-[11px] whitespace-nowrap transition shadow-2xs"
              >
                {q} &rarr;
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-[#D9E8F2] bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Oil Spill AI Copilot (e.g. Which incident has the highest priority?)..."
              className="flex-1 bg-white border border-[#D9E8F2] rounded-xl px-3.5 py-2.5 text-xs text-[#17324D] placeholder-[#8A9AA8] focus:outline-none focus:border-[#1268B3] focus:ring-1 focus:ring-[#1268B3] resize-none max-h-24 shadow-sm"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#1268B3] hover:bg-[#0F4C81] text-white text-xs font-semibold shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#8A9AA8]">
            <span>Press Enter to send &bull; Shift + Enter for new line</span>
            <span>Read-only telemetry copilot &bull; Zero hallucination</span>
          </div>
        </div>
      </div>
    </div>
  );
}
