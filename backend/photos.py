"""Order photos on Cloudinary.

The phone uploads the (already shrunk) picture straight to Cloudinary, so the
picture never passes through our small Render server. The server only:
- signs each upload (so only logged-in owner / uploader can upload, and only
  to the place we choose),
- checks Cloudinary's signed reply before saving the photo on the order,
- deletes pictures on Cloudinary when a photo or order is deleted.

Set CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
(Cloudinary dashboard -> API Keys -> "API environment variable").
Without it the app works as before, just without photos.
"""
import hashlib
import os
import time
import uuid
from urllib.parse import urlparse

import requests

PHOTO_KINDS = ("fabric", "design", "finished", "other")
# The photo shown when only one fits (lists, calendar, bill): the finished
# piece if there is one, else the design, else the fabric.
COVER_ORDER = ("finished", "design", "fabric", "other")

FULL = "c_limit,w_1600,h_1600,q_auto,f_auto"
THUMB = "c_fill,g_auto,w_320,h_320,q_auto,f_auto"
# Bills are drawn on a canvas: use JPEG, which every phone browser can draw.
BILL = "c_fill,g_auto,w_200,h_200,q_auto,f_jpg"


def _config():
    url = os.getenv("CLOUDINARY_URL", "").strip()
    if not url.startswith("cloudinary://"):
        return None
    parsed = urlparse(url)
    if not (parsed.username and parsed.password and parsed.hostname):
        return None
    return {"api_key": parsed.username, "api_secret": parsed.password, "cloud_name": parsed.hostname}


def enabled():
    return _config() is not None


def cloud_name():
    config = _config()
    return config["cloud_name"] if config else None


def _sign(params, secret):
    """Cloudinary signature: sorted key=value pairs joined by '&', then the secret, SHA-1."""
    to_sign = "&".join(f"{key}={params[key]}" for key in sorted(params) if params[key] not in (None, ""))
    return hashlib.sha1((to_sign + secret).encode("utf-8")).hexdigest()


def folder_for(order_id):
    return f"fabart/orders/{order_id}"


def upload_signature(order_id):
    """Everything the phone needs for one signed upload into this order's folder."""
    config = _config()
    params = {
        "public_id": f"{folder_for(order_id)}/{uuid.uuid4().hex[:16]}",
        "timestamp": int(time.time()),
    }
    return {
        **params,
        "api_key": config["api_key"],
        "cloud_name": config["cloud_name"],
        "signature": _sign(params, config["api_secret"]),
        "upload_url": f"https://api.cloudinary.com/v1_1/{config['cloud_name']}/image/upload",
    }


def upload_is_genuine(public_id, version, signature):
    """Cloudinary signs its upload reply with our secret; check it wasn't made up."""
    config = _config()
    if not config or not signature:
        return False
    expected = _sign({"public_id": public_id, "version": version}, config["api_secret"])
    return expected == signature


def delete(public_id):
    """Removes the picture from Cloudinary. Best effort: returns False on failure."""
    config = _config()
    if not config or not public_id:
        return False
    params = {"public_id": public_id, "timestamp": int(time.time()), "invalidate": "true"}
    try:
        response = requests.post(
            f"https://api.cloudinary.com/v1_1/{config['cloud_name']}/image/destroy",
            data={**params, "api_key": config["api_key"], "signature": _sign(params, config["api_secret"])},
            timeout=15,
        )
        return response.ok and response.json().get("result") in ("ok", "not found")
    except (requests.RequestException, ValueError):
        return False


def url(public_id, version, transform=FULL):
    name = cloud_name()
    if not name or not public_id:
        return None
    return f"https://res.cloudinary.com/{name}/image/upload/{transform}/v{version}/{public_id}"
