"""Work: each suit's plan of steps, who does them, and where the order is."""

from datetime import date, datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

import activity
import models
import schemas
from auth import ANYONE, OWNER, STAFF
from database import get_db

router = APIRouter(prefix="/api/v1")

# Everyone except a pure viewer can be given steps (the social media person
# gets steps like "shoot a reel of this suit").
ASSIGNABLE_ROLES = ("owner", "uploader", "worker", "social_media")
IST = timezone(timedelta(hours=5, minutes=30))


def today_ist() -> date:
    """The boutique's 'today' (India), whatever timezone the server is in."""
    return datetime.now(IST).date()


def problem(status, code, message):
    raise HTTPException(status_code=status, detail={"code": code, "message": message, "numbers": []})


def get_task_or_404(db: Session, task_id: int) -> models.OrderTask:
    task = db.get(models.OrderTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def get_order_or_404(db: Session, order_id: int) -> models.Order:
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def check_assignee(db: Session, employee_id):
    if employee_id is None:
        return None
    employee = db.get(models.Employee, employee_id)
    if not employee or not employee.active or employee.role not in ASSIGNABLE_ROLES:
        problem(422, "bad_assignee", "Choose an active team member for this step.")
    return employee


def task_label(task: models.OrderTask):
    return activity.order_label(task.order)


def person(task):
    return task.employee.name if task.employee else None


# ---------------------------------------------------------------- Stages

def set_stage(db, actor, order, new_status, automatic=False):
    """Changes where an order is (received / in work / ready / delivered / cancelled)."""
    order.status_confirmed = True
    if order.status == new_status:
        return
    before = order.status
    order.status = new_status
    if new_status == "delivered":
        order.delivered_at = datetime.now(timezone.utc)
    elif before == "delivered":
        order.delivered_at = None
    activity.log(db, actor, "order", order.id, "updated", label=activity.order_label(order),
                 changes={"status": [before, new_status]}, automatic=automatic or None)


def move_order_along(db, actor, task: models.OrderTask):
    """Starting a step puts the order 'in work'; when every step is done the
    order becomes 'ready'; reopening a step puts it back in work."""
    order = task.order
    if order.status in ("delivered", "cancelled"):
        return
    if task.status == "done" and order.tasks and all(t.status == "done" for t in order.tasks):
        set_stage(db, actor, order, "ready", automatic=True)
    elif task.status != "done" and order.status in ("received", "ready"):
        if task.status == "in_progress" or order.status == "ready":
            set_stage(db, actor, order, "in_work", automatic=True)


# ---------------------------------------------------------------- Unfinished steps move to the next day

def roll_over_tasks(db: Session):
    """Steps not done by their date move to today. The first date is kept in
    original_due_date, so the owner can see how long something has slipped."""
    today = today_ist()
    overdue = (
        db.query(models.OrderTask)
        .filter(models.OrderTask.status != "done", models.OrderTask.due_date < today)
        .all()
    )
    for task in overdue:
        if task.original_due_date is None:
            task.original_due_date = task.due_date
        activity.log(db, None, "task", task.id, "pushed", label=task_label(task),
                     order_id=task.order_id, employee=person(task), task=task.task,
                     from_date=task.due_date, to_date=today)
        task.due_date = today
    if overdue:
        db.commit()


# ---------------------------------------------------------------- Owner: plan the work

def add_step(db, user, order, data: schemas.TaskCreate):
    employee = check_assignee(db, data.employee_id)
    position = max((t.position for t in order.tasks), default=0) + 1
    task = models.OrderTask(
        order_id=order.id,
        employee_id=employee.id if employee else None,
        position=position,
        task=data.task,
        note=(data.note or "").strip() or None,
        due_date=data.due_date,
        status="assigned",
        assigned_by=user.id,
    )
    db.add(task)
    db.flush()
    db.refresh(task)
    activity.log(db, user, "task", task.id, "assigned", label=task_label(task),
                 order_id=order.id, employee=person(task), task=task.task, due_date=task.due_date)
    return task


def open_order(order):
    if order.status in ("delivered", "cancelled"):
        problem(409, "order_closed", "This order is already delivered or cancelled.")


@router.post("/orders/{order_id}/tasks", response_model=schemas.TaskOut)
def assign_task(order_id: int, data: schemas.TaskCreate, db: Session = Depends(get_db), user=Depends(OWNER)):
    order = get_order_or_404(db, order_id)
    open_order(order)
    task = add_step(db, user, order, data)
    if order.status == "ready":  # new work on a finished order
        set_stage(db, user, order, "in_work", automatic=True)
    db.commit()
    db.refresh(task)
    return task


@router.post("/orders/{order_id}/plan", response_model=List[schemas.TaskOut])
def add_plan(order_id: int, data: schemas.PlanCreate, db: Session = Depends(get_db), user=Depends(OWNER)):
    """Adds several steps at once, in this order (e.g. from a template)."""
    order = get_order_or_404(db, order_id)
    open_order(order)
    tasks = []
    for step in data.steps:
        tasks.append(add_step(db, user, order, step))
        db.refresh(order)
    if order.status == "ready":
        set_stage(db, user, order, "in_work", automatic=True)
    db.commit()
    for task in tasks:
        db.refresh(task)
    return tasks


@router.post("/orders/{order_id}/tasks/order", response_model=List[schemas.TaskOut])
def reorder_steps(order_id: int, data: schemas.StepOrder, db: Session = Depends(get_db), user=Depends(OWNER)):
    order = get_order_or_404(db, order_id)
    ids = [t.id for t in order.tasks]
    if sorted(ids) != sorted(data.task_ids):
        problem(422, "bad_order", "Send every step of this order exactly once.")
    by_id = {t.id: t for t in order.tasks}
    before = [by_id[i].task for i in ids]
    for position, task_id in enumerate(data.task_ids, start=1):
        by_id[task_id].position = position
    activity.log(db, user, "order", order.id, "steps_reordered", label=activity.order_label(order),
                 before=before, after=[by_id[i].task for i in data.task_ids])
    db.commit()
    db.refresh(order)
    return order.tasks


@router.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, data: schemas.TaskUpdate, db: Session = Depends(get_db), user=Depends(ANYONE)):
    """Owner: change anything (person, step, date, note, status).
    The person doing the step: only start / finish it."""
    task = get_task_or_404(db, task_id)
    changes = data.model_dump(exclude_unset=True)
    if user.role != "owner":
        if task.employee_id != user.id or set(changes) - {"status"}:
            problem(403, "forbidden", "You don't have access to this.")

    fields = ("employee_id", "task", "due_date", "note", "status")
    before = activity.snapshot(task, fields)
    if "employee_id" in changes:
        check_assignee(db, changes["employee_id"])
    if "due_date" in changes:
        task.original_due_date = None  # a new date chosen by the owner
    for key, value in changes.items():
        if key == "note":
            value = (value or "").strip() or None
        setattr(task, key, value)
    db.flush()
    db.refresh(task)

    if "status" in changes and changes["status"] != before["status"]:
        now = datetime.now(timezone.utc)
        if task.status == "in_progress":
            task.started_at = task.started_at or now
            task.completed_at = None
        elif task.status == "done":
            task.started_at = task.started_at or now
            task.completed_at = now
        else:
            task.completed_at = None
        action = {"in_progress": "started", "done": "done", "assigned": "reopened"}[task.status]
        activity.log(db, user, "task", task.id, action, label=task_label(task),
                     order_id=task.order_id, employee=person(task), task=task.task)
        move_order_along(db, user, task)
    elif changes:
        after = activity.snapshot(task, fields)
        activity.log(db, user, "task", task.id, "updated", label=task_label(task),
                     order_id=task.order_id, employee=person(task), task=task.task,
                     changes=activity.changes(before, after))
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}")
def remove_task(task_id: int, db: Session = Depends(get_db), user=Depends(OWNER)):
    task = get_task_or_404(db, task_id)
    order = task.order
    activity.log(db, user, "task", task.id, "removed", label=task_label(task),
                 order_id=task.order_id, employee=person(task), task=task.task)
    db.delete(task)
    db.flush()
    db.refresh(order)
    # Removing the last unfinished step can finish the order.
    if order.status == "in_work" and order.tasks and all(t.status == "done" for t in order.tasks):
        set_stage(db, user, order, "ready", automatic=True)
    db.commit()
    return {"message": "Task removed"}


@router.get("/work/workload", response_model=List[schemas.Workload])
def workload(db: Session = Depends(get_db), user=Depends(OWNER)):
    """Open and slipped steps per person, to help choose who gets the next one."""
    roll_over_tasks(db)
    people = (
        db.query(models.Employee)
        .filter(models.Employee.active.is_(True), models.Employee.role.in_(ASSIGNABLE_ROLES))
        .order_by(models.Employee.id)
        .all()
    )
    open_tasks = db.query(models.OrderTask).filter(models.OrderTask.status != "done").all()
    result = []
    for member in people:
        mine = [t for t in open_tasks if t.employee_id == member.id]
        result.append({
            "employee": member,
            "open": len(mine),
            "late": sum(1 for t in mine if t.original_due_date is not None),
        })
    return result


# ---------------------------------------------------------------- Old orders: "was this delivered?"

@router.post("/orders/confirm-status", response_model=List[schemas.OrderResponse])
def confirm_status(data: schemas.ConfirmStatus, db: Session = Depends(get_db), user=Depends(STAFF)):
    orders = db.query(models.Order).filter(models.Order.id.in_(data.order_ids)).all()
    for order in orders:
        if data.delivered:
            set_stage(db, user, order, "delivered")
        else:
            order.status_confirmed = True
            activity.log(db, user, "order", order.id, "not_delivered_yet", label=activity.order_label(order))
    db.commit()
    for order in orders:
        db.refresh(order)
    return orders


# ---------------------------------------------------------------- Worker: my work

@router.get("/tasks/mine", response_model=List[schemas.MyTask])
def my_tasks(db: Session = Depends(get_db), user=Depends(ANYONE)):
    """Your open steps, plus what you finished in the last 14 days."""
    roll_over_tasks(db)
    since = datetime.now(timezone.utc) - timedelta(days=14)
    tasks = (
        db.query(models.OrderTask)
        .options(
            selectinload(models.OrderTask.order).selectinload(models.Order.customer),
            selectinload(models.OrderTask.order).selectinload(models.Order.tasks),
        )
        .filter(models.OrderTask.employee_id == user.id)
        .all()
    )

    def recent(task):
        if task.status != "done":
            return True
        done_at = task.completed_at
        if done_at is not None and done_at.tzinfo is None:
            done_at = done_at.replace(tzinfo=timezone.utc)
        return done_at is None or done_at >= since

    result = []
    for task in tasks:
        if not recent(task):
            continue
        order = task.order
        earlier = [
            {"task": t.task, "employee_name": person(t), "status": t.status}
            for t in order.tasks
            if t.id != task.id and (t.position, t.id) < (task.position, task.id) and t.status != "done"
        ]
        result.append({
            **schemas.TaskOut.model_validate(task).model_dump(),
            "waiting_for": earlier if task.status != "done" else [],
            "order": {
                "id": order.id,
                "order_number": order.order_number,
                "customer_name": order.customer.name if order.customer else order.customer_name,
                "additional_info": order.additional_info,
                "what_to_design": order.what_to_design,
                "deliver_date": order.deliver_date,
                "trial_date": order.trial_date,
                "status": order.status,
                "progress": order.progress,
                "current_step": order.current_step,
            },
        })
    return result
