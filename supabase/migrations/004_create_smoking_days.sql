-- Track smoking count per day (click calendar to increment)
CREATE TABLE IF NOT EXISTS smoking_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_smoking_days_user_id ON smoking_days(user_id);
CREATE INDEX IF NOT EXISTS idx_smoking_days_date ON smoking_days(date);

ALTER TABLE smoking_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own smoking days" ON smoking_days
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own smoking days" ON smoking_days
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smoking days" ON smoking_days
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smoking days" ON smoking_days
  FOR DELETE USING (auth.uid() = user_id);
