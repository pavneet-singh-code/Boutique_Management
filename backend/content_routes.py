"""Social media plan: reels / posts / stories, and outfits ready to shoot."""

import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

import activity
import models
import schemas
from auth import require_roles
from database import get_db
from work_routes import IST

router = APIRouter(prefix="/api/v1")

# Who can look at the plan, and who can change it.
CONTENT_VIEWERS = require_roles("owner", "uploader", "social_media")
CONTENT_EDITORS = require_roles("owner", "social_media")


def problem(status, code, message):
    raise HTTPException(status_code=status, detail={"code": code, "message": message, "numbers": []})


def now_local():
    """India time without a zone - content times are stored as boutique local time."""
    return datetime.now(IST).replace(tzinfo=None)


def content_order(order):
    if not order:
        return None
    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_name": order.customer.name if order.customer else order.customer_name,
        "what_to_design": order.what_to_design,
        "status": order.status,
        "progress": order.progress,
        "current_step": order.current_step,
        "ok_to_post": order.ok_to_post,
        "deliver_date": order.deliver_date,
    }


def content_out(item):
    return {
        **schemas.ContentBrief.model_validate(item).model_dump(),
        "brief": item.brief,
        "order_id": item.order_id,
        "order": content_order(item.order),
        "person": schemas.EmployeeBrief.model_validate(item.person) if item.person else None,
        "creator": schemas.EmployeeBrief.model_validate(item.creator) if item.creator else None,
        "posted_at": item.posted_at,
        "created_at": item.created_at,
    }


def get_item_or_404(db, item_id):
    item = db.get(models.ContentItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    return item


def check_links(db, order_id, assigned_to):
    if order_id is not None and not db.get(models.Order, order_id):
        problem(404, "order_not_found", "That order was not found.")
    if assigned_to is not None:
        person = db.get(models.Employee, assigned_to)
        if not person or not person.active:
            problem(422, "bad_assignee", "Choose an active team member.")


# ---------------------------------------------------------------- The plan

@router.get("/content", response_model=List[schemas.ContentOut])
def list_content(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db),
    user=Depends(CONTENT_VIEWERS),
):
    query = db.query(models.ContentItem).options(
        selectinload(models.ContentItem.order).selectinload(models.Order.customer),
        selectinload(models.ContentItem.order).selectinload(models.Order.tasks),
        selectinload(models.ContentItem.person),
        selectinload(models.ContentItem.creator),
    )
    items = query.order_by(models.ContentItem.scheduled_for.is_(None), models.ContentItem.scheduled_for, models.ContentItem.id).all()
    if start or end:
        items = [
            item for item in items
            if item.scheduled_for is None
            or ((not start or item.scheduled_for >= start) and (not end or item.scheduled_for <= end))
        ]
    return [content_out(item) for item in items]


@router.post("/content", response_model=schemas.ContentOut)
def create_content(data: schemas.ContentCreate, db: Session = Depends(get_db), user=Depends(CONTENT_EDITORS)):
    check_links(db, data.order_id, data.assigned_to)
    is_owner = user.role == "owner"
    # The social media person adds ideas; the owner puts them on the schedule.
    status = "planned" if is_owner and data.scheduled_for else "idea"
    item = models.ContentItem(
        title=data.title.strip(),
        brief=(data.brief or "").strip() or None,
        platforms=json.dumps(sorted(set(data.platforms))) if data.platforms else None,
        format=data.format,
        order_id=data.order_id,
        assigned_to=data.assigned_to if is_owner else (data.assigned_to or user.id),
        scheduled_for=data.scheduled_for.replace(tzinfo=None) if data.scheduled_for else None,
        status=status,
        created_by=user.id,
    )
    db.add(item)
    db.flush()
    activity.log(db, user, "content", item.id, "created", label=item.title,
                 status=item.status, scheduled_for=item.scheduled_for, order_id=item.order_id)
    db.commit()
    db.refresh(item)
    return content_out(item)


EDIT_FIELDS = ("title", "brief", "platforms", "format", "order_id", "assigned_to", "scheduled_for", "status", "posted_url")
WORK_STAGES = ("planned", "shooting", "editing", "ready_to_post", "posted")


@router.patch("/content/{item_id}", response_model=schemas.ContentOut)
def update_content(item_id: int, data: schemas.ContentUpdate, db: Session = Depends(get_db), user=Depends(CONTENT_EDITORS)):
    item = get_item_or_404(db, item_id)
    changes = data.model_dump(exclude_unset=True)
    is_owner = user.role == "owner"

    if not is_owner:
        own_idea = item.status == "idea" and item.created_by == user.id
        details = set(changes) - {"status", "posted_url"}
        if details and not own_idea:
            problem(403, "forbidden", "Only the owner can change a scheduled post. You can move it along its stages.")
        if "status" in changes:
            new = changes["status"]
            if item.status == "idea" or new == "idea":
                problem(403, "owner_schedules", "The owner puts ideas on the schedule.")
            if new not in WORK_STAGES:
                problem(422, "bad_stage", "Unknown stage.")

    check_links(db, changes.get("order_id"), changes.get("assigned_to"))
    before = activity.snapshot(item, EDIT_FIELDS)
    for key, value in changes.items():
        if key == "platforms":
            value = json.dumps(sorted(set(value))) if value else None
        elif key in ("title", "brief", "posted_url"):
            value = (value or "").strip() or None
            if key == "title" and not value:
                problem(422, "bad_title", "The title can't be empty.")
        elif key == "scheduled_for" and value is not None:
            value = value.replace(tzinfo=None)
        setattr(item, key, value)

    # Scheduling an idea (owner): giving it a date makes it planned.
    if is_owner and item.status == "idea" and "scheduled_for" in changes and item.scheduled_for and "status" not in changes:
        item.status = "planned"
    if item.status == "posted" and before["status"] != "posted":
        item.posted_at = datetime.now(timezone.utc)
    elif item.status != "posted":
        item.posted_at = None

    after = activity.snapshot(item, EDIT_FIELDS)
    action = "posted" if item.status == "posted" and before["status"] != "posted" else "updated"
    activity.log(db, user, "content", item.id, action, label=item.title,
                 changes=activity.changes(before, after))
    db.commit()
    db.refresh(item)
    return content_out(item)


@router.delete("/content/{item_id}")
def delete_content(item_id: int, db: Session = Depends(get_db), user=Depends(CONTENT_EDITORS)):
    item = get_item_or_404(db, item_id)
    if user.role != "owner" and not (item.status == "idea" and item.created_by == user.id):
        problem(403, "forbidden", "You can only delete your own ideas.")
    activity.log(db, user, "content", item.id, "deleted", label=item.title)
    db.delete(item)
    db.commit()
    return {"message": "Deleted"}


# ---------------------------------------------------------------- Ready to shoot + numbers

@router.get("/content/ready-to-shoot", response_model=List[schemas.ContentOrder])
def ready_to_shoot(db: Session = Depends(get_db), user=Depends(CONTENT_VIEWERS)):
    """Finished outfits the customer allowed us to post, that have no post yet."""
    orders = (
        db.query(models.Order)
        .options(selectinload(models.Order.content), selectinload(models.Order.customer), selectinload(models.Order.tasks))
        .filter(models.Order.ok_to_post.is_(True), models.Order.status == "ready")
        .all()
    )
    return [content_order(o) for o in orders if not o.content]


@router.get("/content/stats")
def content_stats(db: Session = Depends(get_db), user=Depends(CONTENT_VIEWERS)):
    now = now_local()
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    items = db.query(models.ContentItem).all()

    def posted_local(item):
        if not item.posted_at:
            return None
        at = item.posted_at if item.posted_at.tzinfo else item.posted_at.replace(tzinfo=timezone.utc)
        return at.astimezone(IST).replace(tzinfo=None)

    this_week = [i for i in items if i.scheduled_for and week_start <= i.scheduled_for < week_end]
    by_platform = {platform: 0 for platform in models.PLATFORMS}
    for item in this_week:
        for platform in schemas._platforms(item.platforms):
            by_platform[platform] = by_platform.get(platform, 0) + 1

    ready = (
        db.query(models.Order)
        .options(selectinload(models.Order.content))
        .filter(models.Order.ok_to_post.is_(True), models.Order.status == "ready")
        .all()
    )
    return {
        "week_start": week_start.date(),
        "this_week": len(this_week),
        "this_week_posted": sum(1 for i in this_week if i.status == "posted"),
        "this_week_by_platform": by_platform,
        "posted_this_month": sum(1 for i in items if (posted_local(i) or datetime.min) >= month_start),
        "ideas": sum(1 for i in items if i.status == "idea"),
        "overdue": sum(1 for i in items if i.status not in ("idea", "posted") and i.scheduled_for and i.scheduled_for < now),
        "ready_to_shoot": sum(1 for o in ready if not o.content),
    }
