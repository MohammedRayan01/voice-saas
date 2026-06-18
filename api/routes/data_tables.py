"""Data Tables API — CRUD + query for org-owned data tables.

Users create tables (rooms, products, properties, etc.) and the AI
queries them mid-conversation via 'get_table_row' / 'update_table_row'
automation steps.

Endpoints:
    GET    /data-tables                  → list tables for org
    POST   /data-tables                  → create table
    GET    /data-tables/{id}             → get table + schema
    PUT    /data-tables/{id}             → update table name/schema
    DELETE /data-tables/{id}             → delete table + all rows

    GET    /data-tables/{id}/rows        → list rows (paginated)
    POST   /data-tables/{id}/rows        → add row
    PUT    /data-tables/{id}/rows/{row}  → update row
    DELETE /data-tables/{id}/rows/{row}  → delete row
    POST   /data-tables/{id}/query       → filter rows (used by automation runner)
    POST   /data-tables/{id}/import      → bulk import rows from list
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from api.db.base_client import BaseDBClient
from api.db.models import OrgDataRowModel, OrgDataTableModel, UserModel
from api.services.auth.depends import get_user

router = APIRouter(prefix="/data-tables")
_db = BaseDBClient()


# ── Schemas ─────────────────────────────────────────────────────────────────

class ColumnSpec(BaseModel):
    name: str
    type: str  # text | number | boolean | date | list | link
    required: bool = False
    description: Optional[str] = None


class CreateTableRequest(BaseModel):
    name: str
    description: Optional[str] = None
    columns: list[ColumnSpec] = []


class UpdateTableRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    columns: Optional[list[ColumnSpec]] = None


class TableResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    columns: list[ColumnSpec]
    row_count: int
    created_at: datetime
    updated_at: datetime


class RowResponse(BaseModel):
    id: int
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class QueryRequest(BaseModel):
    """Filter rows from a table. Used by automation runner 'get_table_row' step."""
    filters: list[dict[str, Any]] = []
    # Each filter: {field, op, value}  op: eq|neq|gt|gte|lt|lte|contains|is_true|is_false
    sort_by: Optional[str] = None
    sort_dir: str = "asc"
    limit: int = 10
    offset: int = 0


class ImportRequest(BaseModel):
    rows: list[dict[str, Any]]
    replace_all: bool = False  # if true, delete existing rows before import


# ── Table CRUD ───────────────────────────────────────────────────────────────

@router.get("", response_model=list[TableResponse])
async def list_tables(user: UserModel = Depends(get_user)) -> list[TableResponse]:
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataTableModel).where(
                OrgDataTableModel.organization_id == org_id
            ).order_by(OrgDataTableModel.name)
        )
        tables = r.scalars().all()

        results = []
        for t in tables:
            row_count_r = await s.execute(
                select(OrgDataRowModel).where(OrgDataRowModel.table_id == t.id)
            )
            row_count = len(row_count_r.scalars().all())
            results.append(_table_response(t, row_count))
        return results


@router.post("", response_model=TableResponse, status_code=201)
async def create_table(
    body: CreateTableRequest,
    user: UserModel = Depends(get_user),
) -> TableResponse:
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        existing = await s.execute(
            select(OrgDataTableModel).where(
                OrgDataTableModel.organization_id == org_id,
                OrgDataTableModel.name == body.name,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Table '{body.name}' already exists")

        table = OrgDataTableModel(
            organization_id=org_id,
            name=body.name,
            description=body.description,
            schema_json=[c.model_dump() for c in body.columns],
        )
        s.add(table)
        await s.commit()
        await s.refresh(table)
        return _table_response(table, 0)


@router.get("/{table_id}", response_model=TableResponse)
async def get_table(
    table_id: int,
    user: UserModel = Depends(get_user),
) -> TableResponse:
    table = await _get_table_or_404(table_id, user.selected_organization_id)
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataRowModel).where(OrgDataRowModel.table_id == table_id)
        )
        row_count = len(r.scalars().all())
    return _table_response(table, row_count)


@router.put("/{table_id}", response_model=TableResponse)
async def update_table(
    table_id: int,
    body: UpdateTableRequest,
    user: UserModel = Depends(get_user),
) -> TableResponse:
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataTableModel).where(
                OrgDataTableModel.id == table_id,
                OrgDataTableModel.organization_id == org_id,
            )
        )
        table = r.scalar_one_or_none()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        if body.name is not None:
            table.name = body.name
        if body.description is not None:
            table.description = body.description
        if body.columns is not None:
            table.schema_json = [c.model_dump() for c in body.columns]
        table.updated_at = datetime.now(UTC)

        await s.commit()
        await s.refresh(table)

        row_count_r = await s.execute(
            select(OrgDataRowModel).where(OrgDataRowModel.table_id == table_id)
        )
        row_count = len(row_count_r.scalars().all())
        return _table_response(table, row_count)


@router.delete("/{table_id}", status_code=204)
async def delete_table(
    table_id: int,
    user: UserModel = Depends(get_user),
) -> None:
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataTableModel).where(
                OrgDataTableModel.id == table_id,
                OrgDataTableModel.organization_id == org_id,
            )
        )
        table = r.scalar_one_or_none()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        await s.delete(table)
        await s.commit()


# ── Row CRUD ─────────────────────────────────────────────────────────────────

@router.get("/{table_id}/rows", response_model=list[RowResponse])
async def list_rows(
    table_id: int,
    limit: int = 50,
    offset: int = 0,
    user: UserModel = Depends(get_user),
) -> list[RowResponse]:
    await _get_table_or_404(table_id, user.selected_organization_id)
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataRowModel)
            .where(OrgDataRowModel.table_id == table_id)
            .order_by(OrgDataRowModel.id)
            .offset(offset)
            .limit(limit)
        )
        rows = r.scalars().all()
        return [_row_response(row) for row in rows]


@router.post("/{table_id}/rows", response_model=RowResponse, status_code=201)
async def create_row(
    table_id: int,
    data: dict[str, Any],
    user: UserModel = Depends(get_user),
) -> RowResponse:
    org_id = user.selected_organization_id
    await _get_table_or_404(table_id, org_id)
    async with _db.async_session() as s:
        row = OrgDataRowModel(
            table_id=table_id,
            organization_id=org_id,
            data=data,
        )
        s.add(row)
        await s.commit()
        await s.refresh(row)
        return _row_response(row)


@router.put("/{table_id}/rows/{row_id}", response_model=RowResponse)
async def update_row(
    table_id: int,
    row_id: int,
    data: dict[str, Any],
    user: UserModel = Depends(get_user),
) -> RowResponse:
    org_id = user.selected_organization_id
    await _get_table_or_404(table_id, org_id)
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataRowModel).where(
                OrgDataRowModel.id == row_id,
                OrgDataRowModel.table_id == table_id,
                OrgDataRowModel.organization_id == org_id,
            )
        )
        row = r.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Row not found")
        row.data = {**row.data, **data}
        row.updated_at = datetime.now(UTC)
        await s.commit()
        await s.refresh(row)
        return _row_response(row)


@router.delete("/{table_id}/rows/{row_id}", status_code=204)
async def delete_row(
    table_id: int,
    row_id: int,
    user: UserModel = Depends(get_user),
) -> None:
    org_id = user.selected_organization_id
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataRowModel).where(
                OrgDataRowModel.id == row_id,
                OrgDataRowModel.table_id == table_id,
                OrgDataRowModel.organization_id == org_id,
            )
        )
        row = r.scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Row not found")
        await s.delete(row)
        await s.commit()


@router.post("/{table_id}/query", response_model=list[RowResponse])
async def query_rows(
    table_id: int,
    body: QueryRequest,
    user: UserModel = Depends(get_user),
) -> list[RowResponse]:
    """Filter rows by field conditions. Used by automation runner and the AI."""
    org_id = user.selected_organization_id
    await _get_table_or_404(table_id, org_id)
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataRowModel).where(
                OrgDataRowModel.table_id == table_id,
                OrgDataRowModel.organization_id == org_id,
            )
        )
        all_rows = r.scalars().all()

    matching = [row for row in all_rows if _row_matches_filters(row.data, body.filters)]

    if body.sort_by:
        reverse = body.sort_dir == "desc"
        matching.sort(
            key=lambda r: r.data.get(body.sort_by, ""),
            reverse=reverse,
        )

    paginated = matching[body.offset : body.offset + body.limit]
    return [_row_response(row) for row in paginated]


@router.post("/{table_id}/import", response_model=dict)
async def import_rows(
    table_id: int,
    body: ImportRequest,
    user: UserModel = Depends(get_user),
) -> dict:
    """Bulk import rows. Optionally clears existing rows first."""
    org_id = user.selected_organization_id
    await _get_table_or_404(table_id, org_id)
    async with _db.async_session() as s:
        if body.replace_all:
            existing = await s.execute(
                select(OrgDataRowModel).where(OrgDataRowModel.table_id == table_id)
            )
            for row in existing.scalars().all():
                await s.delete(row)

        created = 0
        for row_data in body.rows:
            s.add(OrgDataRowModel(
                table_id=table_id,
                organization_id=org_id,
                data=row_data,
            ))
            created += 1

        await s.commit()
        return {"imported": created}


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_table_or_404(table_id: int, org_id: int) -> OrgDataTableModel:
    async with _db.async_session() as s:
        r = await s.execute(
            select(OrgDataTableModel).where(
                OrgDataTableModel.id == table_id,
                OrgDataTableModel.organization_id == org_id,
            )
        )
        table = r.scalar_one_or_none()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        return table


def _table_response(table: OrgDataTableModel, row_count: int) -> TableResponse:
    columns = [ColumnSpec(**c) for c in (table.schema_json or [])]
    return TableResponse(
        id=table.id,
        name=table.name,
        description=table.description,
        columns=columns,
        row_count=row_count,
        created_at=table.created_at,
        updated_at=table.updated_at,
    )


def _row_response(row: OrgDataRowModel) -> RowResponse:
    return RowResponse(
        id=row.id,
        data=row.data,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _row_matches_filters(data: dict[str, Any], filters: list[dict]) -> bool:
    """Check if a row's data matches all given filter conditions (AND logic)."""
    for f in filters:
        field = f.get("field", "")
        op = f.get("op", "eq")
        expected = f.get("value")
        actual = data.get(field)

        if actual is None:
            if op != "neq":
                return False
            continue

        try:
            if op == "eq":
                if str(actual).lower() != str(expected).lower():
                    return False
            elif op == "neq":
                if str(actual).lower() == str(expected).lower():
                    return False
            elif op == "contains":
                if str(expected).lower() not in str(actual).lower():
                    return False
            elif op == "gt":
                if float(actual) <= float(expected):
                    return False
            elif op == "gte":
                if float(actual) < float(expected):
                    return False
            elif op == "lt":
                if float(actual) >= float(expected):
                    return False
            elif op == "lte":
                if float(actual) > float(expected):
                    return False
            elif op == "is_true":
                if str(actual).lower() not in ("true", "yes", "1"):
                    return False
            elif op == "is_false":
                if str(actual).lower() not in ("false", "no", "0"):
                    return False
        except (TypeError, ValueError):
            return False

    return True
