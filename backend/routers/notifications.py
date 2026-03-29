"""
backend/routers/notifications.py — Email Notifications
========================================================
POST /notifications/email   Send claim notification emails to donor + recipient
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import resend

from backend.config import RESEND_API_KEY
from backend.middleware.auth import get_current_user

router = APIRouter()


class EmailNotification(BaseModel):
    donor_email: str
    recipient_email: str
    food_title: str
    quantity_kg: float
    donor_name: str


@router.post("/email")
def send_claim_email(
    req: EmailNotification,
    current_user: dict = Depends(get_current_user),
):
    if not RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY not configured")

    resend.api_key = RESEND_API_KEY

    from_addr = "FoodBridge <onboarding@resend.dev>"
    results = []

    # ── Email to Donor ────────────────────────────────────────────
    try:
        donor_html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#f0fdf4;border-radius:16px;border:1px solid #bbf7d0;">
            <div style="text-align:center;margin-bottom:20px;">
                <span style="font-size:36px;">🍛</span>
                <h2 style="color:#1B4332;margin:8px 0 4px;">Your listing was claimed!</h2>
                <p style="color:#52B788;font-size:14px;margin:0;">Someone needs your food — thank you for donating!</p>
            </div>
            <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #d1fae5;margin-bottom:16px;">
                <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">LISTING DETAILS</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#1B4332;">{req.food_title}</p>
                <p style="margin:4px 0 0;color:#52B788;font-weight:600;">{req.quantity_kg} kg</p>
            </div>
            <p style="color:#6b7280;font-size:13px;text-align:center;">
                Please prepare the food for pickup. The recipient has been notified and is on their way.
            </p>
            <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid #d1fae5;">
                <span style="color:#2D6A4F;font-weight:700;font-size:14px;">🌿 FoodBridge</span>
                <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">Real-Time Surplus Food Redistribution Platform</p>
            </div>
        </div>
        """

        r1 = resend.Emails.send({
            "from": from_addr,
            "to": [req.donor_email],
            "subject": f"🍛 Your listing \"{req.food_title}\" was just claimed!",
            "html": donor_html,
        })
        results.append({"to": "donor", "status": "sent", "id": r1.get("id", "ok")})
    except Exception as e:
        results.append({"to": "donor", "status": "failed", "error": str(e)})

    # ── Email to Recipient ────────────────────────────────────────
    try:
        recipient_html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#eff6ff;border-radius:16px;border:1px solid #bfdbfe;">
            <div style="text-align:center;margin-bottom:20px;">
                <span style="font-size:36px;">✅</span>
                <h2 style="color:#1e3a5f;margin:8px 0 4px;">Claim confirmed!</h2>
                <p style="color:#0369A1;font-size:14px;margin:0;">Your food pickup is ready.</p>
            </div>
            <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #dbeafe;margin-bottom:16px;">
                <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">PICKUP DETAILS</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#1e3a5f;">{req.food_title}</p>
                <p style="margin:4px 0 0;color:#0369A1;font-weight:600;">{req.quantity_kg} kg from {req.donor_name}</p>
            </div>
            <p style="color:#6b7280;font-size:13px;text-align:center;">
                Head to the pickup location shown in the app. The donor has been notified and is expecting you.
            </p>
            <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid #dbeafe;">
                <span style="color:#2D6A4F;font-weight:700;font-size:14px;">🌿 FoodBridge</span>
                <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">Real-Time Surplus Food Redistribution Platform</p>
            </div>
        </div>
        """

        r2 = resend.Emails.send({
            "from": from_addr,
            "to": [req.recipient_email],
            "subject": f"✅ Claim confirmed — pickup \"{req.food_title}\" ({req.quantity_kg} kg)",
            "html": recipient_html,
        })
        results.append({"to": "recipient", "status": "sent", "id": r2.get("id", "ok")})
    except Exception as e:
        results.append({"to": "recipient", "status": "failed", "error": str(e)})

    return {"message": "Email notifications processed", "results": results}
