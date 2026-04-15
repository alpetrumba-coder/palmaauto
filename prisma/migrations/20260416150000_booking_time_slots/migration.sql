-- Желаемое время получения/сдачи (информационные поля)

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "pickup_time_slot" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "dropoff_time_slot" VARCHAR(20);

