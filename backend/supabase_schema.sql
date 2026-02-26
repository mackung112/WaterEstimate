-- ==========================================
-- Supabase Schema สำหรับ WaterEstimate
-- รันใน Supabase SQL Editor
-- ==========================================

-- ลบตารางเดิม (ถ้ามี) เพื่อสร้างใหม่
DROP TABLE IF EXISTS job_items CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS master_materials CASCADE;
DROP TABLE IF EXISTS master_personnel CASCADE;

-- 1. ตาราง Jobs (รายการงานประมาณการ)
CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    request_no TEXT,
    request_date DATE,
    estimate_no TEXT,
    customer_name TEXT,
    house_no TEXT,
    moo TEXT,
    tambon TEXT,
    amphoe TEXT,
    province TEXT,
    meter_size TEXT,
    status TEXT DEFAULT 'Pending',
    user_number TEXT,
    map_url TEXT,
    image_url TEXT,
    gis_image_url TEXT,
    surveyor_name TEXT,
    surveyor_pos TEXT,
    inspector_name TEXT,
    inspector_pos TEXT,
    approver_name TEXT,
    approver_pos TEXT,
    print_date TIMESTAMPTZ
);

-- 2. ตาราง Job Items (รายการวัสดุในแต่ละงาน)
CREATE TABLE job_items (
    transaction_id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
    section TEXT,
    material_id TEXT,
    item_name TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    unit_price_mat NUMERIC DEFAULT 0,
    unit_price_labor NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0
);

-- 3. ตาราง Master Materials (ข้อมูลวัสดุ)
CREATE TABLE master_materials (
    material_id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    category TEXT,
    size TEXT,
    unit TEXT,
    price_material NUMERIC DEFAULT 0,
    price_labor NUMERIC DEFAULT 0
);

-- 4. ตาราง Master Personnel (ข้อมูลบุคลากร)
CREATE TABLE master_personnel (
    personnel_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role_type TEXT,
    position TEXT,
    signature_url TEXT
);

-- 5. สร้าง Index สำหรับ Performance
CREATE INDEX IF NOT EXISTS idx_job_items_job_id ON job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_timestamp ON jobs(timestamp DESC);

-- 6. เปิด Row Level Security (RLS) - ตั้งค่า policy แบบ public access
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_personnel ENABLE ROW LEVEL SECURITY;

-- Policy: อนุญาตทุก operation สำหรับ anon (เพราะเป็น internal app)
CREATE POLICY "Allow all for jobs" ON jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for job_items" ON job_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for master_materials" ON master_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for master_personnel" ON master_personnel FOR ALL USING (true) WITH CHECK (true);

-- 7. สร้าง Storage Bucket สำหรับ GIS Images
INSERT INTO storage.buckets (id, name, public) VALUES ('gis-images', 'gis-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: อนุญาต upload/read สำหรับ anon (ลบ policy เดิมก่อน ถ้ามี)
DROP POLICY IF EXISTS "Allow public read gis-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert gis-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update gis-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete gis-images" ON storage.objects;

CREATE POLICY "Allow public read gis-images" ON storage.objects FOR SELECT USING (bucket_id = 'gis-images');
CREATE POLICY "Allow public insert gis-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gis-images');
CREATE POLICY "Allow public update gis-images" ON storage.objects FOR UPDATE USING (bucket_id = 'gis-images');
CREATE POLICY "Allow public delete gis-images" ON storage.objects FOR DELETE USING (bucket_id = 'gis-images');
