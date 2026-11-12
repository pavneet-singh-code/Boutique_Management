"""Activity log helpers: who did what, and when."""

import json
from datetime import date, datetime

import models


def _plain(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def snapshot(obj, fields):
    return {field: _plain(getattr(obj, field)) for field in fields}


def changes(before: dict, after: dict) -> dict:
    """{"field": [old, new]} for the fields that changed."""
    return {
        key: [before.get(key), after.get(key)]
        for key in after
        if before.get(key) != after.get(key)
    }


def log(db, actor, entity, entity_id, action, label=None, **details):
    """Adds an activity entry to the current transaction (saved with it)."""
    details = {key: value for key, value in details.items() if value not in (None, {}, [])}
    db.add(
        models.ActivityLog(
            actor_id=actor.id if actor else None,
            entity=entity,
            entity_id=entity_id,
            action=action,
            label=label,
            details=json.dumps(details, default=str, ensure_ascii=False) if details else None,
        )
    )


def order_label(order) -> str:
    name = order.customer.name if order.customer else order.customer_name
    return " ".join(part for part in (f"#{order.order_number}" if order.order_number else f"id {order.id}", name) if part)
