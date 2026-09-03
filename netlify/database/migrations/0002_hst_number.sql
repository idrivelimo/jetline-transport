-- The business number under which HST is collected. A tax invoice must show it
-- for the customer to claim an input tax credit, so it prints in the letterhead
-- whenever it is set. Nullable: an operator below the small-supplier threshold
-- does not register, and their invoices simply carry no tax.
alter table settings add column if not exists hst_number text;
