import { createClient } from "@supabase/supabase-js"

//supabaseのプロジェクトURLとAPIキー
const projectUrl = "https://nafxngyxyanlerimmoov.supabase.co"
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hZnhuZ3l4eWFubGVyaW1tb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0ODEzMDIsImV4cCI6MjA2NjA1NzMwMn0.YMV0nvaFO1fr6tNkKH0Av_N3vS-ydRC1rXFby5m7FHU"

export const supabase = createClient(projectUrl,apiKey)




