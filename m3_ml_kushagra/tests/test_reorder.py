import math

import pytest

from m3_ml_kushagra.ml_service.reorder import reorder_point, reorder_quantity, safety_stock


def test_srs_worked_example():
    assert reorder_point(10, 5, 20) == 70
    assert reorder_quantity(10, 5, 7, 20, stock=60, on_order=0) == 80


def test_reorder_quantity_never_negative():
    assert reorder_quantity(10, 5, 7, 20, stock=1000, on_order=50) == 0


def test_on_order_reduces_quantity():
    assert reorder_quantity(10, 5, 7, 20, stock=60, on_order=30) == 50


def test_safety_stock_formula():
    assert safety_stock(1.65, 4, 9) == pytest.approx(1.65 * 4 * 3)
    assert safety_stock(sigma=2, lead_time=5) == pytest.approx(1.65 * 2 * math.sqrt(5))
    with pytest.raises(ValueError):
        safety_stock(1.65, -1, 5)
