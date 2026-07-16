const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://jgsbftwmwwqclfrdxvfz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc2JmdHdtd3dxY2xmcmR4dmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjIzNDQsImV4cCI6MjA5OTczODM0NH0.Esm0h8lmyq7pU-_zPxBvlLkzv3I_cc1F7Pb25GNLW28";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Getting public URL...");
  const { data } = supabase.storage.from("claim-images").getPublicUrl("f800422e-51a7-4e9d-a96d-542c5d5bf863/429e5eda-84da-43c8-9b23-904596c3a535.jpg");
  console.log("Public URL:", data.publicUrl);

  const res = await fetch(data.publicUrl);
  console.log("Fetch Status:", res.status);
}

run();
