"""Reorder calculations (FR-3.4). Pure functions; integrated with the backend in Sprint 7 (FR-3.5).

Symbols (SRS §5.1.1):
    d  = average daily demand (units/day, from the forecast)
    L  = supplier lead time (days)
    R  = review period (days), default 7
    σ  = standard deviation of daily demand
    Z  = service-level factor, default 1.65 (≈95 %)
"""
import math

Z_DEFAULT = 1.65
REVIEW_DAYS_DEFAULT = 7


def safety_stock(z=Z_DEFAULT, sigma=0.0, lead_time=0.0):
    """SS = Z · σ · √L"""
    if sigma < 0 or lead_time < 0:
        raise ValueError("sigma and lead_time must be >= 0")
    return z * sigma * math.sqrt(lead_time)


def reorder_point(d, lead_time, ss):
    """ROP = d · L + SS"""
    return d * lead_time + ss


def reorder_quantity(d, lead_time, review_days=REVIEW_DAYS_DEFAULT, ss=0.0, stock=0.0, on_order=0.0):
    """Q = max(0, d · (L + R) + SS − current stock − on order)"""
    return max(0.0, d * (lead_time + review_days) + ss - stock - on_order)
