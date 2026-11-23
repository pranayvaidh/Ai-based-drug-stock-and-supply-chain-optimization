"""Module 2 (Kunal Prajapat): Drug Inventory & Supply Chain blueprints.

Registered by the Module 1 app factory (decision D2).
"""


def register_blueprints(app):
    from .branches.routes import bp as branches_bp
    from .drugs.routes import bp as drugs_bp
    from .purchase_orders.routes import bp as po_bp
    from .sales.routes import bp as sales_bp
    from .stock.routes import bp as stock_bp
    from .suppliers.routes import bp as suppliers_bp

    for bp in (drugs_bp, suppliers_bp, branches_bp, stock_bp, sales_bp, po_bp):
        app.register_blueprint(bp)
