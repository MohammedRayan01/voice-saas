from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from api.db.contact_client import ContactClient
from api.db.models import UserModel
from api.schemas.contacts import ContactCreate, ContactListResponse, ContactResponse, ContactUpdate
from api.services.auth.depends import get_user

router = APIRouter(prefix="/contacts")

_client = ContactClient()


@router.post("", response_model=ContactResponse, status_code=201)
async def create_contact(
    body: ContactCreate,
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    contact = await _client.create_contact(org_id, body.model_dump())
    return contact


@router.get("", response_model=ContactListResponse)
async def list_contacts(
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    contacts, total = await _client.list_contacts(org_id, search=search, tag=tag, offset=offset, limit=limit)
    return ContactListResponse(contacts=contacts, total=total, offset=offset, limit=limit)


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: int,
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    contact = await _client.get_contact(contact_id, org_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: int,
    body: ContactUpdate,
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    contact = await _client.update_contact(contact_id, org_id, data)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: int,
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    deleted = await _client.delete_contact(contact_id, org_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contact not found")


@router.get("/lookup/phone", response_model=ContactResponse)
async def lookup_by_phone(
    phone: str = Query(...),
    user: UserModel = Depends(get_user),
):
    org_id = user.selected_organization_id
    contact = await _client.get_contact_by_phone(phone, org_id)
    if not contact:
        raise HTTPException(status_code=404, detail="No contact found with that phone number")
    return contact
