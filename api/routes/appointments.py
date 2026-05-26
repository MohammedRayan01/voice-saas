"""Appointments API routes — list, get, and cancel booked calendar appointments."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, update

from api.db import db_client
from api.db.models import AppointmentModel, UserModel
from api.services.auth.depends import get_user
from api.services.integrations.google_calendar import client as gcal

router = APIRouter(prefix="/appointments")


class AppointmentResponse(BaseModel):
    id: int
    appointment_uuid: str
    organization_id: int
    workflow_run_id: Optional[int]
    google_event_id: Optional[str]
    summary: str
    caller_name: Optional[str]
    caller_number: Optional[str]
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    status: Optional[str] = Query(None, description="Filter by status: scheduled | cancelled"),
    from_date: Optional[datetime] = Query(None, description="Filter appointments starting after this datetime"),
    to_date: Optional[datetime] = Query(None, description="Filter appointments starting before this datetime"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    async with db_client.async_session() as session:
        q = select(AppointmentModel).where(AppointmentModel.organization_id == org_id)
        if status:
            q = q.where(AppointmentModel.status == status)
        if from_date:
            q = q.where(AppointmentModel.start_time >= from_date)
        if to_date:
            q = q.where(AppointmentModel.start_time <= to_date)
        q = q.order_by(AppointmentModel.start_time.desc()).offset(offset).limit(limit)
        result = await session.execute(q)
        return result.scalars().all()


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: int, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with db_client.async_session() as session:
        result = await session.execute(
            select(AppointmentModel).where(
                AppointmentModel.id == appointment_id,
                AppointmentModel.organization_id == org_id,
            )
        )
        appt = result.scalar_one_or_none()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return appt


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(appointment_id: int, user: UserModel = Depends(get_user)):
    org_id = user.selected_organization_id
    async with db_client.async_session() as session:
        result = await session.execute(
            select(AppointmentModel).where(
                AppointmentModel.id == appointment_id,
                AppointmentModel.organization_id == org_id,
            )
        )
        appt = result.scalar_one_or_none()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        if appt.status == "cancelled":
            raise HTTPException(status_code=400, detail="Appointment already cancelled")

        if appt.google_event_id:
            try:
                await gcal.cancel_appointment(org_id, appt.google_event_id)
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Failed to cancel in Google Calendar: {e}")

        await session.execute(
            update(AppointmentModel)
            .where(AppointmentModel.id == appointment_id)
            .values(status="cancelled")
        )
        await session.commit()
        await session.refresh(appt)
        appt.status = "cancelled"
        return appt
