"""Photos on orders: owner and uploader add / change / delete them;
everyone who can see the order (or works on it) sees them."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import activity
import models
import photos
import schemas
from auth import STAFF
from database import get_db

router = APIRouter(prefix="/api/v1", tags=["photos"])

MAX_PHOTOS_PER_ORDER = 20


def _not_configured():
    raise HTTPException(
        status_code=503,
        detail={
            "code": "photos_not_configured",
            "numbers": [],
            "message": "Photos aren't set up yet: add CLOUDINARY_URL on the server.",
        },
    )


def _order_or_404(db, order_id):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def _photo_or_404(db, photo_id):
    photo = db.query(models.OrderPhoto).filter(models.OrderPhoto.id == photo_id).first()
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


@router.post("/orders/{order_id}/photos/upload-signature")
def photo_upload_signature(order_id: int, db: Session = Depends(get_db), user=Depends(STAFF)):
    """Permission for the phone to upload one picture for this order to Cloudinary."""
    if not photos.enabled():
        _not_configured()
    order = _order_or_404(db, order_id)
    if len(order.photos) >= MAX_PHOTOS_PER_ORDER:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "too_many_photos",
                "numbers": [],
                "message": f"An order can have at most {MAX_PHOTOS_PER_ORDER} photos.",
            },
        )
    return photos.upload_signature(order.id)


@router.post("/orders/{order_id}/photos", response_model=schemas.PhotoOut)
def add_photo(order_id: int, data: schemas.PhotoCreate, db: Session = Depends(get_db), user=Depends(STAFF)):
    """Saves a picture the phone has just uploaded to Cloudinary."""
    if not photos.enabled():
        _not_configured()
    order = _order_or_404(db, order_id)
    # Only pictures uploaded with our signature, into this order's folder.
    if not data.public_id.startswith(photos.folder_for(order.id) + "/") or not photos.upload_is_genuine(
        data.public_id, data.version, data.signature
    ):
        raise HTTPException(
            status_code=400,
            detail={"code": "photo_not_verified", "numbers": [], "message": "This upload couldn't be verified."},
        )
    # The same upload sent twice (e.g. a retry on a slow connection): keep one.
    existing = db.query(models.OrderPhoto).filter(models.OrderPhoto.public_id == data.public_id).first()
    if existing is not None:
        return existing
    photo = models.OrderPhoto(
        order_id=order.id,
        kind=data.kind,
        note=(data.note or "").strip() or None,
        public_id=data.public_id,
        version=data.version,
        width=data.width,
        height=data.height,
        bytes=data.bytes,
        uploaded_by=user.id,
    )
    try:
        db.add(photo)
        db.flush()
        activity.log(
            db, user, "order", order.id, "photo_added",
            label=activity.order_label(order), kind=photo.kind, photo_id=photo.id,
        )
        db.commit()
    except IntegrityError:  # two copies of the same upload arrived at once
        db.rollback()
        existing = db.query(models.OrderPhoto).filter(models.OrderPhoto.public_id == data.public_id).first()
        if existing is None:
            raise
        return existing
    db.refresh(photo)
    return photo


@router.patch("/photos/{photo_id}", response_model=schemas.PhotoOut)
def update_photo(photo_id: int, data: schemas.PhotoUpdate, db: Session = Depends(get_db), user=Depends(STAFF)):
    photo = _photo_or_404(db, photo_id)
    values = data.model_dump(exclude_unset=True)
    if "note" in values:
        values["note"] = (values["note"] or "").strip() or None
    before = activity.snapshot(photo, values.keys())
    for key, value in values.items():
        if value is not None or key == "note":
            setattr(photo, key, value)
    changed = activity.changes(before, activity.snapshot(photo, values.keys()))
    if changed:
        activity.log(
            db, user, "order", photo.order_id, "photo_updated",
            label=activity.order_label(photo.order), photo_id=photo.id, changes=changed,
        )
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: int, db: Session = Depends(get_db), user=Depends(STAFF)):
    photo = _photo_or_404(db, photo_id)
    order = photo.order
    removed = photos.delete(photo.public_id)
    if not removed:
        # Keep going: a leftover file on Cloudinary is better than a photo that can't be removed.
        print(f"WARNING: could not delete {photo.public_id} on Cloudinary", flush=True)
    activity.log(
        db, user, "order", order.id, "photo_deleted",
        label=activity.order_label(order), kind=photo.kind,
    )
    db.delete(photo)
    db.commit()
    return {"message": "Photo deleted"}


def delete_order_photos(order):
    """Called before an order is deleted: removes its pictures from Cloudinary."""
    for photo in list(order.photos):
        if not photos.delete(photo.public_id):
            print(f"WARNING: could not delete {photo.public_id} on Cloudinary", flush=True)
