"""
Seed workflow templates into the database.
Run from the repo root: python -m api.scripts.seed_templates
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from api.db.workflow_template_client import WorkflowTemplateClient

# ─── Template definitions ────────────────────────────────────────────────────

TEMPLATES = [

    # ── 1. Appointment Booking ────────────────────────────────────────────────
    {
        "name": "Appointment Booking",
        "description": "Greet callers, collect their details, check availability, and confirm bookings. Perfect for clinics, salons, and service businesses.",
        "json": {
            "nodes": [
                {
                    "id": "start",
                    "type": "startCall",
                    "position": {"x": 100, "y": 200},
                    "data": {
                        "name": "Greeting",
                        "greeting_type": "text",
                        "greeting": "Hello! Thank you for calling {{business_name}}. I'm your virtual assistant and I'm here to help you schedule an appointment.",
                        "prompt": (
                            "You are a friendly appointment scheduling assistant for {{business_name}}. "
                            "Your goal is to warmly greet the caller and understand what type of appointment they need. "
                            "Ask for their name if they haven't introduced themselves. "
                            "Be concise — this is a phone call, not a chat. "
                            "Once you understand what they need, transition to collecting their details."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "caller_name", "type": "string", "prompt": "The caller's name"},
                            {"name": "appointment_type", "type": "string", "prompt": "Type of appointment or service requested"}
                        ]
                    }
                },
                {
                    "id": "collect_details",
                    "type": "agentNode",
                    "position": {"x": 400, "y": 200},
                    "data": {
                        "name": "Collect Details",
                        "prompt": (
                            "You are collecting scheduling details from {{caller_name}}. "
                            "Ask for: their preferred date and time, phone number for confirmation, and any special notes. "
                            "Be natural — don't ask all questions at once. "
                            "Once you have all details, transition to confirming the booking. "
                            "If they say they are not interested or want to cancel, transition to end call."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "preferred_date", "type": "string", "prompt": "Preferred date for the appointment"},
                            {"name": "preferred_time", "type": "string", "prompt": "Preferred time for the appointment"},
                            {"name": "phone_number", "type": "string", "prompt": "Caller's phone number for confirmation"},
                            {"name": "special_notes", "type": "string", "prompt": "Any special requests or notes"}
                        ]
                    }
                },
                {
                    "id": "confirm_booking",
                    "type": "agentNode",
                    "position": {"x": 700, "y": 100},
                    "data": {
                        "name": "Confirm Booking",
                        "prompt": (
                            "You are confirming the appointment for {{caller_name}}. "
                            "Summarize: the appointment type ({{appointment_type}}), date ({{preferred_date}}), time ({{preferred_time}}). "
                            "Ask them to confirm this is correct. "
                            "Once confirmed, thank them and let them know they'll receive a confirmation. "
                            "Then end the call gracefully."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": False
                    }
                },
                {
                    "id": "end",
                    "type": "endCall",
                    "position": {"x": 1000, "y": 200},
                    "data": {
                        "name": "End Call"
                    }
                }
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "collect_details",
                    "label": "collect_details",
                    "data": {
                        "label": "collect_details",
                        "condition": "The caller has stated what type of appointment they need and you are ready to collect scheduling details"
                    }
                },
                {
                    "id": "e2",
                    "source": "collect_details",
                    "target": "confirm_booking",
                    "label": "confirm_booking",
                    "data": {
                        "label": "confirm_booking",
                        "condition": "You have collected the caller's preferred date, time, and phone number"
                    }
                },
                {
                    "id": "e3",
                    "source": "collect_details",
                    "target": "end",
                    "label": "end_call",
                    "data": {
                        "label": "end_call",
                        "condition": "The caller wants to cancel, is not interested, or wants to call back later"
                    }
                },
                {
                    "id": "e4",
                    "source": "confirm_booking",
                    "target": "end",
                    "label": "end_call",
                    "data": {
                        "label": "end_call",
                        "condition": "The booking is confirmed and the caller is ready to hang up"
                    }
                }
            ]
        }
    },

    # ── 2. Lead Qualification ─────────────────────────────────────────────────
    {
        "name": "Lead Qualification",
        "description": "Qualify inbound leads by understanding their needs, budget, and timeline. Route hot leads to sales, cold leads to nurturing.",
        "json": {
            "nodes": [
                {
                    "id": "start",
                    "type": "startCall",
                    "position": {"x": 100, "y": 300},
                    "data": {
                        "name": "Greeting",
                        "greeting_type": "text",
                        "greeting": "Hi there! Thanks for reaching out to {{business_name}}. I'm here to learn a bit about what you're looking for.",
                        "prompt": (
                            "You are a friendly lead qualification specialist for {{business_name}}. "
                            "Warmly introduce yourself and ask the caller's name and what brought them to call today. "
                            "Listen carefully to understand their situation before asking follow-up questions. "
                            "Be conversational, not scripted."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "caller_name", "type": "string", "prompt": "The caller's name"},
                            {"name": "initial_need", "type": "string", "prompt": "What the caller is looking for"}
                        ]
                    }
                },
                {
                    "id": "discover_needs",
                    "type": "agentNode",
                    "position": {"x": 400, "y": 300},
                    "data": {
                        "name": "Discover Needs",
                        "prompt": (
                            "You are discovering the needs of {{caller_name}}. "
                            "Ask about: their current situation, what problem they are trying to solve, "
                            "their timeline (when do they need this?), and their approximate budget. "
                            "Ask one question at a time. Be genuinely curious, not interrogating. "
                            "Once you have a clear picture, route to the appropriate next step."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "budget", "type": "string", "prompt": "Their budget or budget range"},
                            {"name": "timeline", "type": "string", "prompt": "When they need the solution"},
                            {"name": "pain_point", "type": "string", "prompt": "Main problem they are trying to solve"},
                            {"name": "decision_maker", "type": "boolean", "prompt": "Whether they are the decision maker"}
                        ]
                    }
                },
                {
                    "id": "hot_lead",
                    "type": "agentNode",
                    "position": {"x": 700, "y": 100},
                    "data": {
                        "name": "Hot Lead — Book Demo",
                        "prompt": (
                            "{{caller_name}} is a qualified lead ready to move forward. "
                            "Express genuine excitement about helping them. "
                            "Offer to schedule a demo or consultation with a specialist who can walk them through exactly how {{business_name}} solves their problem. "
                            "Collect their preferred time for the demo and confirm their email for the invite. "
                            "Keep energy high and momentum going."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "demo_time", "type": "string", "prompt": "Preferred time for demo"},
                            {"name": "email", "type": "string", "prompt": "Email address for calendar invite"}
                        ]
                    }
                },
                {
                    "id": "nurture",
                    "type": "agentNode",
                    "position": {"x": 700, "y": 400},
                    "data": {
                        "name": "Nurture — Not Ready Yet",
                        "prompt": (
                            "{{caller_name}} is interested but not ready to commit right now. "
                            "Be understanding — don't push. "
                            "Offer to send them helpful resources via email. "
                            "Ask when would be a better time to follow up. "
                            "Leave them with a positive impression of {{business_name}}."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "email", "type": "string", "prompt": "Email to send resources"},
                            {"name": "followup_date", "type": "string", "prompt": "Best time to follow up"}
                        ]
                    }
                },
                {
                    "id": "end",
                    "type": "endCall",
                    "position": {"x": 1000, "y": 300},
                    "data": {"name": "End Call"}
                }
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "discover_needs",
                    "label": "discover_needs",
                    "data": {"label": "discover_needs", "condition": "You have the caller's name and initial reason for calling"}
                },
                {
                    "id": "e2",
                    "source": "discover_needs",
                    "target": "hot_lead",
                    "label": "route_hot_lead",
                    "data": {"label": "route_hot_lead", "condition": "The caller has clear budget, urgent timeline, and is the decision maker — they are a hot lead ready to move forward"}
                },
                {
                    "id": "e3",
                    "source": "discover_needs",
                    "target": "nurture",
                    "label": "route_nurture",
                    "data": {"label": "route_nurture", "condition": "The caller is interested but has no budget, unclear timeline, or is just browsing — they need nurturing"}
                },
                {
                    "id": "e4",
                    "source": "hot_lead",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Demo is scheduled or the conversation is complete"}
                },
                {
                    "id": "e5",
                    "source": "nurture",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Follow-up plan is set and the caller is ready to hang up"}
                }
            ]
        }
    },

    # ── 3. Customer Support ───────────────────────────────────────────────────
    {
        "name": "Customer Support",
        "description": "Handle inbound support calls — identify the issue, resolve it or escalate to a human agent. Works for SaaS, e-commerce, and service businesses.",
        "json": {
            "nodes": [
                {
                    "id": "start",
                    "type": "startCall",
                    "position": {"x": 100, "y": 300},
                    "data": {
                        "name": "Greeting",
                        "greeting_type": "text",
                        "greeting": "Thank you for calling {{business_name}} support. I'm your AI assistant. How can I help you today?",
                        "prompt": (
                            "You are a professional customer support agent for {{business_name}}. "
                            "Greet the caller warmly and ask for their name and account/order number if relevant. "
                            "Listen carefully to understand their issue before asking questions. "
                            "Be empathetic — customers calling support may already be frustrated."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "caller_name", "type": "string", "prompt": "Customer's name"},
                            {"name": "issue_summary", "type": "string", "prompt": "Brief summary of the issue"},
                            {"name": "account_id", "type": "string", "prompt": "Account or order number if provided"}
                        ]
                    }
                },
                {
                    "id": "diagnose",
                    "type": "agentNode",
                    "position": {"x": 400, "y": 300},
                    "data": {
                        "name": "Diagnose Issue",
                        "prompt": (
                            "You are diagnosing {{caller_name}}'s issue: {{issue_summary}}. "
                            "Ask clarifying questions to fully understand the problem. "
                            "Try to resolve the issue yourself using your knowledge. "
                            "If the issue is simple (billing question, how-to, account info), resolve it directly. "
                            "If it requires backend access or is a complex bug, escalate to a human agent. "
                            "If the caller is angry or distressed, immediately escalate with empathy."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "issue_category", "type": "string", "prompt": "Category: billing, technical, account, shipping, other"},
                            {"name": "issue_resolved", "type": "boolean", "prompt": "Whether the issue was fully resolved"}
                        ]
                    }
                },
                {
                    "id": "resolve",
                    "type": "agentNode",
                    "position": {"x": 700, "y": 100},
                    "data": {
                        "name": "Resolve & Close",
                        "prompt": (
                            "You have resolved {{caller_name}}'s issue. "
                            "Summarize what you did or explained. "
                            "Ask if there is anything else you can help with. "
                            "If not, thank them for contacting {{business_name}} and wish them a great day. "
                            "Keep it warm but brief."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": False
                    }
                },
                {
                    "id": "escalate",
                    "type": "agentNode",
                    "position": {"x": 700, "y": 450},
                    "data": {
                        "name": "Escalate to Human",
                        "prompt": (
                            "You need to escalate {{caller_name}}'s issue to a human agent. "
                            "Be transparent and empathetic: explain that you are connecting them with a specialist who can help further. "
                            "Do not make them repeat their issue — assure them the agent will have context. "
                            "Apologise for any inconvenience and thank them for their patience. "
                            "Then end the call so the transfer can happen."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": False
                    }
                },
                {
                    "id": "end",
                    "type": "endCall",
                    "position": {"x": 1000, "y": 300},
                    "data": {"name": "End Call"}
                }
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "diagnose",
                    "label": "diagnose_issue",
                    "data": {"label": "diagnose_issue", "condition": "You understand the caller's issue and are ready to investigate"}
                },
                {
                    "id": "e2",
                    "source": "diagnose",
                    "target": "resolve",
                    "label": "resolve_issue",
                    "data": {"label": "resolve_issue", "condition": "You have successfully resolved the issue or answered the question"}
                },
                {
                    "id": "e3",
                    "source": "diagnose",
                    "target": "escalate",
                    "label": "escalate_to_human",
                    "data": {"label": "escalate_to_human", "condition": "The issue requires a human agent — it is complex, requires backend access, or the caller is very upset"}
                },
                {
                    "id": "e4",
                    "source": "resolve",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "The caller is satisfied and ready to end the call"}
                },
                {
                    "id": "e5",
                    "source": "escalate",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Escalation is complete and caller is being transferred"}
                }
            ]
        }
    },

    # ── 4. Outbound Sales ─────────────────────────────────────────────────────
    {
        "name": "Outbound Sales",
        "description": "Cold or warm outbound calling — introduce your product, handle objections, and close for a demo or meeting.",
        "json": {
            "nodes": [
                {
                    "id": "start",
                    "type": "startCall",
                    "position": {"x": 100, "y": 300},
                    "data": {
                        "name": "Introduction",
                        "greeting_type": "text",
                        "greeting": "Hi, is this {{first_name}}?",
                        "prompt": (
                            "You are a sales representative for {{business_name}}. "
                            "Confirm you are speaking with {{first_name}} {{last_name}}. "
                            "Introduce yourself briefly and state the purpose of your call in one sentence. "
                            "Ask if they have 2 minutes — respect their time. "
                            "If they say no or it is a bad time, offer to call back and end politely. "
                            "If they are open to talking, move to the pitch."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "confirmed_contact", "type": "boolean", "prompt": "Whether you confirmed you are speaking with the right person"},
                            {"name": "open_to_talk", "type": "boolean", "prompt": "Whether they agreed to hear the pitch"}
                        ]
                    }
                },
                {
                    "id": "pitch",
                    "type": "agentNode",
                    "position": {"x": 400, "y": 200},
                    "data": {
                        "name": "Value Pitch",
                        "prompt": (
                            "You are pitching {{business_name}} to {{first_name}}. "
                            "Lead with the problem you solve, not the product features. "
                            "Keep it to 3 sentences max, then ask a question to engage them. "
                            "Listen for signals: interest, objections, or questions. "
                            "If they are interested, move to scheduling a demo. "
                            "If they raise an objection, move to handling it. "
                            "If they are clearly not interested, thank them and end gracefully."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "objection", "type": "string", "prompt": "Main objection raised if any"},
                            {"name": "interest_level", "type": "string", "prompt": "high, medium, or low interest based on their response"}
                        ]
                    }
                },
                {
                    "id": "handle_objection",
                    "type": "agentNode",
                    "position": {"x": 700, "y": 400},
                    "data": {
                        "name": "Handle Objection",
                        "prompt": (
                            "{{first_name}} raised an objection: {{objection}}. "
                            "Acknowledge it genuinely — don't dismiss or argue. "
                            "Use the feel-felt-found method: 'I understand how you feel, others felt the same, and what they found was...'. "
                            "Address the objection with a specific benefit or proof point. "
                            "Then ask if that addresses their concern. "
                            "If they are now open, move to scheduling. If they remain firm, end gracefully."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": False
                    }
                },
                {
                    "id": "schedule_demo",
                    "type": "agentNode",
                    "position": {"x": 700, "y": 100},
                    "data": {
                        "name": "Schedule Demo",
                        "prompt": (
                            "{{first_name}} is interested in learning more. "
                            "Ask for their preferred date and time for a 20-minute demo. "
                            "Confirm their email for the calendar invite. "
                            "Express genuine excitement — this is a win. "
                            "Confirm all details back to them before ending."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "demo_date", "type": "string", "prompt": "Agreed demo date"},
                            {"name": "demo_time", "type": "string", "prompt": "Agreed demo time"},
                            {"name": "email", "type": "string", "prompt": "Email for calendar invite"}
                        ]
                    }
                },
                {
                    "id": "end",
                    "type": "endCall",
                    "position": {"x": 1000, "y": 300},
                    "data": {"name": "End Call"}
                }
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "pitch",
                    "label": "start_pitch",
                    "data": {"label": "start_pitch", "condition": "The prospect confirmed they are available and willing to hear the pitch"}
                },
                {
                    "id": "e2",
                    "source": "start",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Bad time or wrong person — end politely"}
                },
                {
                    "id": "e3",
                    "source": "pitch",
                    "target": "schedule_demo",
                    "label": "schedule_demo",
                    "data": {"label": "schedule_demo", "condition": "The prospect is interested and ready to schedule a demo or meeting"}
                },
                {
                    "id": "e4",
                    "source": "pitch",
                    "target": "handle_objection",
                    "label": "handle_objection",
                    "data": {"label": "handle_objection", "condition": "The prospect raised a specific objection that needs to be addressed"}
                },
                {
                    "id": "e5",
                    "source": "pitch",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "The prospect is clearly not interested — end gracefully"}
                },
                {
                    "id": "e6",
                    "source": "handle_objection",
                    "target": "schedule_demo",
                    "label": "schedule_demo",
                    "data": {"label": "schedule_demo", "condition": "Objection handled successfully and prospect is now open to a demo"}
                },
                {
                    "id": "e7",
                    "source": "handle_objection",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Prospect remains firm after objection handling"}
                },
                {
                    "id": "e8",
                    "source": "schedule_demo",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Demo is scheduled and confirmed"}
                }
            ]
        }
    },

    # ── 5. Inbound Receptionist ───────────────────────────────────────────────
    {
        "name": "Inbound Receptionist",
        "description": "Handle all inbound calls — greet callers, understand their need, and route them to the right department or take a message.",
        "json": {
            "nodes": [
                {
                    "id": "start",
                    "type": "startCall",
                    "position": {"x": 100, "y": 300},
                    "data": {
                        "name": "Greeting",
                        "greeting_type": "text",
                        "greeting": "Good {{time_of_day}}, thank you for calling {{business_name}}. How may I direct your call?",
                        "prompt": (
                            "You are the virtual receptionist for {{business_name}}. "
                            "Greet the caller professionally and ask how you can help. "
                            "Listen to understand what department or person they need. "
                            "Available departments: Sales, Support, Billing, General Enquiries. "
                            "If they just have a quick question you can answer, help them directly. "
                            "Otherwise route them to the right department."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "caller_name", "type": "string", "prompt": "Caller's name if given"},
                            {"name": "reason_for_call", "type": "string", "prompt": "Why they are calling"},
                            {"name": "department_needed", "type": "string", "prompt": "Department they need: sales, support, billing, general"}
                        ]
                    }
                },
                {
                    "id": "route_sales",
                    "type": "agentNode",
                    "position": {"x": 400, "y": 50},
                    "data": {
                        "name": "Route to Sales",
                        "prompt": (
                            "{{caller_name or 'The caller'}} wants to speak with the sales team. "
                            "Let them know you are transferring them to a sales specialist. "
                            "Ask if they have a specific product or pricing question you can help with first — sometimes you can save them the wait. "
                            "If they prefer to speak with sales directly, confirm the transfer and end the call."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": False
                    }
                },
                {
                    "id": "route_support",
                    "type": "agentNode",
                    "position": {"x": 400, "y": 200},
                    "data": {
                        "name": "Route to Support",
                        "prompt": (
                            "{{caller_name or 'The caller'}} needs technical support. "
                            "Ask for their account or order number so support has context. "
                            "Give them a brief idea of wait times if applicable. "
                            "Then confirm you are connecting them and end the call."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "account_id", "type": "string", "prompt": "Account or order number"}
                        ]
                    }
                },
                {
                    "id": "take_message",
                    "type": "agentNode",
                    "position": {"x": 400, "y": 420},
                    "data": {
                        "name": "Take a Message",
                        "prompt": (
                            "The relevant person or department is unavailable. "
                            "Offer to take a message. "
                            "Collect: caller's name, phone number, best time to call back, and their message. "
                            "Confirm the details back to them. "
                            "Assure them someone will get back to them within {{response_time or '1 business day'}}."
                        ),
                        "allow_interrupt": True,
                        "add_global_prompt": False,
                        "extraction_enabled": True,
                        "extraction_variables": [
                            {"name": "caller_name", "type": "string", "prompt": "Caller's name"},
                            {"name": "callback_number", "type": "string", "prompt": "Phone number to call back"},
                            {"name": "callback_time", "type": "string", "prompt": "Best time to call back"},
                            {"name": "message", "type": "string", "prompt": "Message to pass on"}
                        ]
                    }
                },
                {
                    "id": "end",
                    "type": "endCall",
                    "position": {"x": 700, "y": 300},
                    "data": {"name": "End Call"}
                }
            ],
            "edges": [
                {
                    "id": "e1",
                    "source": "start",
                    "target": "route_sales",
                    "label": "route_to_sales",
                    "data": {"label": "route_to_sales", "condition": "Caller wants to speak with sales or has a pricing or product question"}
                },
                {
                    "id": "e2",
                    "source": "start",
                    "target": "route_support",
                    "label": "route_to_support",
                    "data": {"label": "route_to_support", "condition": "Caller needs technical support or has an issue with their account or order"}
                },
                {
                    "id": "e3",
                    "source": "start",
                    "target": "take_message",
                    "label": "take_message",
                    "data": {"label": "take_message", "condition": "Caller wants to leave a message or the department they need is unavailable"}
                },
                {
                    "id": "e4",
                    "source": "route_sales",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Transfer confirmed or question answered"}
                },
                {
                    "id": "e5",
                    "source": "route_support",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Transfer confirmed"}
                },
                {
                    "id": "e6",
                    "source": "take_message",
                    "target": "end",
                    "label": "end_call",
                    "data": {"label": "end_call", "condition": "Message taken and confirmed"}
                }
            ]
        }
    },

]


# ─── Seed function ────────────────────────────────────────────────────────────

async def seed():
    client = WorkflowTemplateClient()

    existing = await client.get_all_workflow_templates()
    existing_names = {t.template_name for t in existing}

    created = 0
    skipped = 0

    for t in TEMPLATES:
        if t["name"] in existing_names:
            print(f"  SKIP  {t['name']} (already exists)")
            skipped += 1
            continue

        await client.create_workflow_template(
            template_name=t["name"],
            template_description=t["description"],
            template_json=t["json"],
        )
        print(f"  OK    {t['name']}")
        created += 1

    print(f"\nDone: {created} created, {skipped} skipped.")


if __name__ == "__main__":
    asyncio.run(seed())
