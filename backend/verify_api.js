const supabaseUrl = "https://jgsbftwmwwqclfrdxvfz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc2JmdHdtd3dxY2xmcmR4dmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjIzNDQsImV4cCI6MjA5OTczODM0NH0.Esm0h8lmyq7pU-_zPxBvlLkzv3I_cc1F7Pb25GNLW28";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impnc2JmdHdtd3dxY2xmcmR4dmZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE2MjM0NCwiZXhwIjoyMDk5NzM4MzQ0fQ.vfIop6XQj_DYJktV5YqfDPWoEJKTw_vMNc0B5oH3f94";
const apiBase = "http://localhost:8000";

async function run() {
  console.log("=== STARTING API INTEGRATION TESTS ===");

  // 1. Sign in with the seeded user
  const email = "adjuster@claimsight.io";
  const password = "SecurePassword123!";

  console.log(`\n[1/7] Signing in as adjuster account: ${email}`);
  const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseAnonKey
    },
    body: JSON.stringify({ email, password })
  });

  const signInData = await signInRes.json();
  if (signInRes.status >= 400) {
    console.error("Sign in failed:", signInData);
    process.exit(1);
  }

  const token = signInData.access_token;
  console.log("Sign in successful. JWT Token obtained!");

  // 1b. Clean up database records for this user to ensure clean state
  console.log("Cleaning up existing claims for this user...");
  const { createClient } = require("@supabase/supabase-js");
  const tempSupabase = createClient(supabaseUrl, supabaseServiceKey);
  await tempSupabase.from("claims").delete().eq("user_id", "f800422e-51a7-4e9d-a96d-542c5d5bf863");
  console.log("Cleanup completed.");

  // 2. Fetch empty claims list
  console.log("\n[2/7] Fetching claims list (should be empty)...");
  const claimsRes = await fetch(`${apiBase}/api/claims`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const claimsData = await claimsRes.json();
  console.log("Response:", claimsData);
  if (claimsData.claims.length !== 0 || claimsData.total !== 0) {
    console.error("Expected empty claims, got:", claimsData);
    process.exit(1);
  }

  // 3. Upload claim image
  console.log("\n[3/7] Uploading damage photo...");
  const fs = require("fs");
  const path = require("path");
  const imgBuffer = fs.readFileSync("/Users/keermanipamisetty/.gemini/antigravity-ide/brain/50a62e67-ea53-4250-bcc7-ffe832d25078/scratch/car-damage.jpg");
  
  // Create native FormData payload
  const formData = new FormData();
  const blob = new Blob([imgBuffer], { type: "image/jpeg" });
  formData.append("image", blob, "car-damage.jpg");

  const uploadRes = await fetch(`${apiBase}/api/claims/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });

  const uploadData = await uploadRes.json();
  console.log("Response Status:", uploadRes.status);
  console.log("Response JSON:", uploadData);
  
  if (uploadRes.status !== 201 || !uploadData.claim_id) {
    console.error("Upload failed!");
    process.exit(1);
  }
  const claimId = uploadData.claim_id;

  // 4. Run AI assessment
  console.log(`\n[4/7] Running AI assessment for claim: ${claimId}...`);
  const assessRes = await fetch(`${apiBase}/api/claims/${claimId}/assess`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const assessData = await assessRes.json();
  console.log("Assessment Response:", assessData);
  if (assessRes.status !== 200) {
    console.error("Assessment failed!");
    process.exit(1);
  }

  // 5. Query claim status and verify fields
  console.log(`\n[5/7] Verifying claim detail status: ${claimId}...`);
  const detailRes = await fetch(`${apiBase}/api/claims/${claimId}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const detailData = await detailRes.json();
  console.log("Claim Detail Response:", detailData);
  if (detailRes.status !== 200 || detailData.claim.status !== "assessed") {
    console.error("Claim detail status incorrect!");
    process.exit(1);
  }

  // 6. Verify stats endpoint
  console.log("\n[6/7] Verifying dashboard statistics...");
  const statsRes = await fetch(`${apiBase}/api/claims/stats`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const statsData = await statsRes.json();
  console.log("Stats Response:", statsData);
  if (statsData.total !== 1 || statsData.completed !== 1 || statsData.pending !== 0) {
    console.error("Stats incorrect!");
    process.exit(1);
  }

  // 7. Verify IDOR Prevention (prevent accessing another user's claim)
  console.log("\n[7/7] Testing IDOR prevention (using a second user token)...");
  const secondEmail = "adjuster-test-2@claimsight.io";
  const signInRes2 = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseAnonKey
    },
    body: JSON.stringify({ email: secondEmail, password })
  });
  const signInData2 = await signInRes2.json();
  const token2 = signInData2.access_token;

  const idorRes = await fetch(`${apiBase}/api/claims/${claimId}`, {
    headers: {
      "Authorization": `Bearer ${token2}`
    }
  });
  console.log("IDOR Access Response Status:", idorRes.status);
  if (idorRes.status !== 404) {
    console.error("IDOR check failed! Second user should receive 404 for first user's claim, got:", idorRes.status);
    process.exit(1);
  }
  console.log("IDOR check passed successfully (Returned 404/Not Found)!");

  console.log("\n=== ALL INTEGRATION ENDPOINTS TESTED AND PASSED SUCCESSFULLY ===");
}

run().catch(err => {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
