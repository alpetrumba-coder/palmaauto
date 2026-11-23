-- Ремонт Акиртава: смета, накладные/расходы по строкам, фото. Только новые таблицы.
CREATE TABLE IF NOT EXISTS "repair_estimate_items" (
    "id" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "subsection" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "article" TEXT,
    "unit" TEXT NOT NULL DEFAULT '',
    "qty" DOUBLE PRECISION,
    "price_kop" INTEGER,
    "sum_kop" INTEGER NOT NULL,
    CONSTRAINT "repair_estimate_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "repair_estimate_items_project_line_no_key" ON "repair_estimate_items"("project", "line_no");
CREATE INDEX IF NOT EXISTS "repair_estimate_items_project_article_idx" ON "repair_estimate_items"("project", "article");

CREATE TABLE IF NOT EXISTS "repair_docs" (
    "id" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_ref" TEXT,
    "number" TEXT,
    "date" DATE NOT NULL,
    "supplier" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'goods',
    "destination" TEXT NOT NULL DEFAULT 'akirtava',
    "total_kop" INTEGER NOT NULL,
    "comment" TEXT,
    "operation_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at" TIMESTAMP(3),
    CONSTRAINT "repair_docs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "repair_docs_external_ref_key" ON "repair_docs"("external_ref");
CREATE UNIQUE INDEX IF NOT EXISTS "repair_docs_operation_id_key" ON "repair_docs"("operation_id");
CREATE INDEX IF NOT EXISTS "repair_docs_project_date_idx" ON "repair_docs"("project", "date");

CREATE TABLE IF NOT EXISTS "repair_doc_lines" (
    "id" TEXT NOT NULL,
    "doc_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "article" TEXT,
    "unit" TEXT,
    "qty" DOUBLE PRECISION,
    "price_kop" INTEGER,
    "sum_kop" INTEGER NOT NULL,
    "estimate_item_id" TEXT,
    "match_mode" TEXT NOT NULL DEFAULT 'none',
    CONSTRAINT "repair_doc_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "repair_doc_lines_doc_id_idx" ON "repair_doc_lines"("doc_id");
CREATE INDEX IF NOT EXISTS "repair_doc_lines_estimate_item_id_idx" ON "repair_doc_lines"("estimate_item_id");
ALTER TABLE "repair_doc_lines" ADD CONSTRAINT "repair_doc_lines_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "repair_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_doc_lines" ADD CONSTRAINT "repair_doc_lines_estimate_item_id_fkey" FOREIGN KEY ("estimate_item_id") REFERENCES "repair_estimate_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "repair_files" (
    "id" TEXT NOT NULL,
    "doc_id" TEXT,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "caption" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repair_files_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "repair_files_doc_id_idx" ON "repair_files"("doc_id");
ALTER TABLE "repair_files" ADD CONSTRAINT "repair_files_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "repair_docs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
