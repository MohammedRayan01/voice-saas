"""Resort & Hospitality industry pack.

Creates:
- 1 pipeline with 6 stages
- 12 pre-built automations
- AI system prompt with 8 intent types
- OrganizationConfiguration keys: INDUSTRY_TYPE, INDUSTRY_CONFIG,
  BUSINESS_HOURS, AFTER_HOURS_MESSAGE, WHATSAPP_SYSTEM_PROMPT
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.models import (
    PipelineModel,
    PipelineStageModel,
    WaAutomationModel,
)
from api.services.whatsapp.packs.base import IndustryPack

_PACK_PREFIX = "[Resort Pack]"


class ResortPack(IndustryPack):

    @property
    def pack_id(self) -> str:
        return "resort"

    @property
    def name(self) -> str:
        return "Resort & Hospitality"

    @property
    def description(self) -> str:
        return "Turn WhatsApp into your 24/7 AI concierge — handles room bookings, spa, restaurant, and guest services automatically."

    @property
    def icon(self) -> str:
        return "🏨"

    @property
    def features(self) -> list[str]:
        return [
            "12 pre-built automations",
            "6-stage booking pipeline",
            "8 intent types (booking, spa, dining, activities, complaints, VIP...)",
            "AI lead scoring (VIP detection)",
            "Pre-arrival & post-stay drip sequences",
            "Human escalation for complaints & VIP",
        ]

    @property
    def wizard_schema(self) -> list[dict]:
        return [
            {
                "title": "Business Basics",
                "fields": [
                    {"name": "business_name", "label": "Property Name", "type": "text", "required": True, "placeholder": "e.g. The Seabreeze Resort"},
                    {"name": "city", "label": "City / Location", "type": "text", "required": True, "placeholder": "e.g. Goa"},
                    {"name": "property_type", "label": "Property Type", "type": "select", "required": True,
                     "options": ["Beach", "Hill / Mountain", "City", "Heritage / Palace", "Eco / Jungle"]},
                    {"name": "tagline", "label": "One-line tagline (optional)", "type": "text", "required": False,
                     "placeholder": "e.g. Where luxury meets the Arabian Sea"},
                ],
            },
            {
                "title": "Room Types",
                "description": "Add your room categories and their maximum occupancy.",
                "fields": [
                    {"name": "room_types", "label": "Room Types", "type": "room_list", "required": True,
                     "placeholder": "e.g. Standard Room (2 guests), Deluxe Sea View (2 guests), Villa (4 guests)"},
                ],
            },
            {
                "title": "Services & Amenities",
                "fields": [
                    {"name": "has_spa", "label": "Spa", "type": "checkbox"},
                    {"name": "has_restaurant", "label": "Restaurant / Dining", "type": "checkbox"},
                    {"name": "has_activities", "label": "Activities / Experiences", "type": "checkbox"},
                    {"name": "has_events", "label": "Events / Banquet", "type": "checkbox"},
                    {"name": "amenities_description", "label": "Brief amenities description", "type": "textarea",
                     "placeholder": "e.g. Infinity pool, private beach, Ayurveda spa, sunset cruises..."},
                ],
            },
            {
                "title": "Business Hours",
                "fields": [
                    {"name": "checkin_time", "label": "Standard Check-in Time", "type": "time", "required": True, "placeholder": "14:00"},
                    {"name": "checkout_time", "label": "Standard Check-out Time", "type": "time", "required": True, "placeholder": "11:00"},
                    {"name": "reception_hours", "label": "Reception Hours", "type": "text", "placeholder": "e.g. 24/7 or 8am–10pm"},
                    {"name": "timezone", "label": "Timezone", "type": "select", "required": True,
                     "options": ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York"]},
                    {"name": "after_hours_message", "label": "After-Hours Message", "type": "textarea",
                     "placeholder": "e.g. Our reception is currently closed. We're available 8am–10pm IST. Leave your message and we'll reply first thing in the morning!"},
                ],
            },
            {
                "title": "Team & Escalation",
                "fields": [
                    {"name": "default_agent_email", "label": "Default Agent Email (for escalations)", "type": "email",
                     "placeholder": "e.g. frontdesk@seabreeze.com"},
                    {"name": "manager_phone", "label": "Manager WhatsApp (for VIP/complaints)", "type": "tel",
                     "placeholder": "e.g. +91 98765 43210"},
                    {"name": "google_review_link", "label": "Google Review Link (for post-stay)", "type": "url",
                     "placeholder": "https://g.page/r/..."},
                ],
            },
        ]

    def system_prompt_template(self, config: dict) -> str:
        name = config.get("business_name", "the resort")
        city = config.get("city", "")
        prop_type = config.get("property_type", "Resort")
        amenities = config.get("amenities_description", "luxury amenities")
        checkin = config.get("checkin_time", "14:00")
        checkout = config.get("checkout_time", "11:00")
        room_types_raw = config.get("room_types", "Standard Room, Deluxe Room, Suite")

        services = []
        if config.get("has_spa"):
            services.append("Spa")
        if config.get("has_restaurant"):
            services.append("Restaurant & Dining")
        if config.get("has_activities"):
            services.append("Activities & Experiences")
        if config.get("has_events"):
            services.append("Events & Banquet")
        services_str = ", ".join(services) if services else "hotel amenities"

        return f"""You are the AI Concierge for {name}, a {prop_type} resort in {city}.

## Your Role
You assist guests and potential guests on WhatsApp with bookings, inquiries, and services.
Be warm, professional, and helpful. Respond in the same language the guest uses.
Keep replies concise — 2-4 sentences unless detailed info is needed.

## About {name}
- Location: {city}
- Property Type: {prop_type} Resort
- Room Types: {room_types_raw}
- Services: {services_str}
- Amenities: {amenities}
- Check-in: {checkin} | Check-out: {checkout}

## Intent Detection
Classify every guest message into one of these intents and respond accordingly:

**ROOM_BOOKING** — Guest wants to book a room or check availability
  → Collect: check-in date, check-out date, number of guests, room preference, guest name, phone
  → Call save_lead_data with collected fields
  → Check calendar availability if dates provided
  → Create a warm, personalized booking summary

**SPA** — Guest asks about spa treatments or wants to book
  → Share spa menu highlights
  → Collect: preferred date, time, treatment preference, guest name
  → Escalate to human if specific treatment pricing needed

**RESTAURANT** — Guest wants to make a dining reservation
  → Collect: date, time, number of guests, any dietary restrictions
  → Confirm reservation details

**ACTIVITY** — Guest wants activities, experiences, or excursions
  → Share available activities based on property type
  → Collect: preferred date/time, activity choice, number of participants

**EXISTING_GUEST** — Guest is currently staying (mentions room number, or says "we're here")
  → Address immediately, offer concierge services
  → Escalate to human if it's a complaint or requires in-room action

**COMPLAINT** — Guest expresses dissatisfaction or reports a problem
  → Acknowledge immediately and sincerely
  → Escalate to human: end your reply with the single word ESCALATE on its own line
  → Add context about the complaint before escalating

**VIP** — Guest signals VIP intent (honeymoon, anniversary, corporate group, budget > ₹50,000/night, NRI, or luxury upgrade request)
  → Offer premium treatment, personal manager contact
  → Escalate to human for personalized VIP arrangements: ESCALATE

**HUMAN_REQUEST** — Guest explicitly asks for a human, manager, or says "let me speak to someone"
  → Acknowledge and escalate: ESCALATE

## Lead Scoring
Use save_lead_data to capture:
- guest_name, guest_phone (always)
- checkin_date, checkout_date, nights
- room_preference, guest_count
- budget_indication (if mentioned)
- is_vip: true if honeymoon/anniversary/corporate/NRI/budget mention

## Important Rules
- Never make up room rates — say "Our team will send you a personalized quote"
- Never promise availability without checking the calendar tool
- For payments, always say "Our team will assist you with the booking confirmation"
- If unsure about any specific detail, say "Let me connect you with our team for that"
"""

    async def install(
        self,
        org_id: int,
        config: dict,
        session: AsyncSession,
    ) -> dict:
        """Create pipeline, stages, and automations for the resort pack."""
        pipeline_id = await self._create_pipeline(org_id, session)
        automation_count = await self._create_automations(org_id, config, pipeline_id, session)

        return {
            "automations_created": automation_count,
            "pipeline_created": True,
            "pipeline_id": pipeline_id,
        }

    async def uninstall(self, org_id: int, session: AsyncSession) -> None:
        """Remove automations and pipelines created by this pack."""
        from sqlalchemy import delete

        await session.execute(
            WaAutomationModel.__table__.delete().where(
                WaAutomationModel.organization_id == org_id,
                WaAutomationModel.name.like(f"{_PACK_PREFIX}%"),
            )
        )
        await session.execute(
            PipelineModel.__table__.delete().where(
                PipelineModel.organization_id == org_id,
                PipelineModel.name == f"{_PACK_PREFIX} Bookings",
            )
        )
        await session.commit()

    # ── Private helpers ────────────────────────────────────────────────────

    async def _create_pipeline(self, org_id: int, session: AsyncSession) -> int:
        pipeline = PipelineModel(
            organization_id=org_id,
            name=f"{_PACK_PREFIX} Bookings",
        )
        session.add(pipeline)
        await session.flush()

        stages = [
            ("New Inquiry", 0, "#6366f1"),
            ("Availability Checked", 1, "#f59e0b"),
            ("Booking Confirmed", 2, "#3b82f6"),
            ("Pre-Arrival", 3, "#8b5cf6"),
            ("Checked In", 4, "#10b981"),
            ("Post-Stay", 5, "#6b7280"),
        ]
        for name, pos, color in stages:
            session.add(PipelineStageModel(
                pipeline_id=pipeline.id,
                name=name,
                position=pos,
                color=color,
            ))

        await session.commit()
        return pipeline.id

    async def _create_automations(
        self,
        org_id: int,
        config: dict,
        pipeline_id: int,
        session: AsyncSession,
    ) -> int:
        business_name = config.get("business_name", "the resort")
        google_review_link = config.get("google_review_link", "")
        default_agent_email = config.get("default_agent_email", "")

        automations = [
            # 1 — Welcome
            {
                "name": f"{_PACK_PREFIX} Welcome Message",
                "trigger_type": "new_message_received",
                "trigger_config": {"first_message_only": True},
                "steps": [
                    {
                        "step_type": "send_message",
                        "step_config": {"text": f"Welcome to {business_name}! 🏨 I'm your AI Concierge, here to help with room bookings, spa, dining, and any guest services. How can I assist you today?"},
                    },
                    {"step_type": "ai_reply", "step_config": {}},
                ],
            },
            # 2 — Booking Confirmation
            {
                "name": f"{_PACK_PREFIX} Booking Confirmation",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["booking confirmed", "confirmed my booking", "booking is confirmed"]},
                "steps": [
                    {
                        "step_type": "send_message",
                        "step_config": {"text": f"Wonderful! Your booking at {business_name} is confirmed. 🎉 We're excited to welcome you! You'll receive a detailed confirmation shortly. Is there anything special we can arrange for your stay?"},
                    },
                    {
                        "step_type": "create_deal",
                        "step_config": {"pipeline": f"{_PACK_PREFIX} Bookings", "stage": "Booking Confirmed", "title": "{contact.first_name} - Booking"},
                    },
                    {"step_type": "add_tag", "step_config": {"tag": "booked"}},
                ],
            },
            # 3 — Pre-Arrival D-7
            {
                "name": f"{_PACK_PREFIX} Pre-Arrival Drip D-7",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["7 days before", "pre arrival d7"]},
                "steps": [
                    {
                        "step_type": "send_message",
                        "step_config": {"text": f"Hi {'{contact.first_name}'}! 🌟 Just 7 days until your arrival at {business_name}. We're preparing everything for a memorable stay. Have you considered adding a spa treatment or special dining experience? Reply 'SPA' or 'DINING' to explore options!"},
                    },
                    {"step_type": "update_contact", "step_config": {"fields": {"pre_arrival_d7_sent": "true"}}},
                ],
            },
            # 4 — Pre-Arrival D-1
            {
                "name": f"{_PACK_PREFIX} Pre-Arrival Reminder D-1",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["1 day before", "pre arrival d1"]},
                "steps": [
                    {
                        "step_type": "send_message",
                        "step_config": {"text": f"Exciting news — you arrive at {business_name} TOMORROW! 🎊\n\nCheck-in starts from the standard time. Our concierge team will be ready to welcome you. Safe travels! Reply anytime if you need directions or have questions."},
                    },
                ],
            },
            # 5 — Check-In
            {
                "name": f"{_PACK_PREFIX} Check-In Welcome",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["checked in", "just arrived", "at the resort", "in my room"]},
                "steps": [
                    {
                        "step_type": "send_message",
                        "step_config": {"text": f"Welcome to {business_name}! 🏨 We're so glad you're here. Our concierge team is at your service. You can reach us through this WhatsApp chat anytime. What can we arrange for you today?"},
                    },
                    {"step_type": "update_contact", "step_config": {"fields": {"status": "checked_in"}}},
                    {
                        "step_type": "create_deal",
                        "step_config": {"pipeline": f"{_PACK_PREFIX} Bookings", "stage": "Checked In", "title": "{contact.first_name} - Active Stay"},
                    },
                ],
            },
            # 6 — Restaurant
            {
                "name": f"{_PACK_PREFIX} Restaurant Booking",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["restaurant", "dining", "dinner", "lunch", "breakfast", "food", "eat"]},
                "steps": [
                    {"step_type": "ai_reply", "step_config": {}},
                    {
                        "step_type": "create_deal",
                        "step_config": {"pipeline": f"{_PACK_PREFIX} Bookings", "stage": "New Inquiry", "title": "{contact.first_name} - Dining Inquiry"},
                    },
                ],
            },
            # 7 — Spa
            {
                "name": f"{_PACK_PREFIX} Spa Booking",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["spa", "massage", "treatment", "wellness", "ayurveda", "beauty"]},
                "steps": [
                    {"step_type": "ai_reply", "step_config": {}},
                    {
                        "step_type": "create_deal",
                        "step_config": {"pipeline": f"{_PACK_PREFIX} Bookings", "stage": "New Inquiry", "title": "{contact.first_name} - Spa Inquiry"},
                    },
                ],
            },
            # 8 — Complaint Handler
            {
                "name": f"{_PACK_PREFIX} Complaint Handler",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["complaint", "unhappy", "problem", "issue", "bad", "terrible", "disappointed", "unacceptable"]},
                "steps": [
                    {
                        "step_type": "send_message",
                        "step_config": {"text": f"We sincerely apologize for the inconvenience. Your experience matters deeply to us at {business_name}. I'm connecting you with our manager right now to resolve this immediately. 🙏"},
                    },
                    {"step_type": "add_tag", "step_config": {"tag": "complaint"}},
                    *([{"step_type": "assign_conversation", "step_config": {"agent_email": default_agent_email}}] if default_agent_email else []),
                ],
            },
            # 9 — Post-Stay Review
            {
                "name": f"{_PACK_PREFIX} Post-Stay Review Request",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["checked out", "just checked out", "leaving", "goodbye", "thank you for the stay"]},
                "steps": [
                    {
                        "step_type": "send_message",
                        "step_config": {"text": f"Thank you for staying with us at {business_name}! It was an absolute pleasure having you. 🌟\n\nWe'd love to hear about your experience. A quick review would mean the world to us:{(' ' + google_review_link) if google_review_link else ''}\n\nWe hope to welcome you back soon! 🏨"},
                    },
                    {
                        "step_type": "create_deal",
                        "step_config": {"pipeline": f"{_PACK_PREFIX} Bookings", "stage": "Post-Stay", "title": "{contact.first_name} - Post-Stay"},
                    },
                ],
            },
            # 10 — Loyalty / Points
            {
                "name": f"{_PACK_PREFIX} Loyalty Inquiry",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["points", "loyalty", "membership", "reward", "redeem"]},
                "steps": [
                    {"step_type": "ai_reply", "step_config": {}},
                ],
            },
            # 11 — Reactivation (90 days)
            {
                "name": f"{_PACK_PREFIX} Reactivation (90 days)",
                "trigger_type": "keyword_match",
                "trigger_config": {"keywords": ["reactivation_90d"]},
                "steps": [
                    {
                        "step_type": "send_message",
                        "step_config": {"text": f"We miss you at {business_name}! 🌴 It's been a while since your last visit. We have exclusive offers for returning guests — would you like to plan another escape? Reply 'YES' and we'll share our best rates just for you!"},
                    },
                    {"step_type": "add_tag", "step_config": {"tag": "reactivation_sent"}},
                ],
            },
            # 12 — General AI Reply (catch-all)
            {
                "name": f"{_PACK_PREFIX} AI Concierge (Catch-all)",
                "trigger_type": "new_message_received",
                "trigger_config": {},
                "steps": [
                    {"step_type": "ai_reply", "step_config": {}},
                ],
            },
        ]

        count = 0
        for auto_data in automations:
            session.add(WaAutomationModel(
                organization_id=org_id,
                name=auto_data["name"],
                trigger_type=auto_data["trigger_type"],
                trigger_config=auto_data["trigger_config"],
                steps=auto_data["steps"],
                is_active=True,
            ))
            count += 1

        await session.commit()
        return count
