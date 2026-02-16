const { io } = require("socket.io-client");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";
const EMAIL = `test_${Math.floor(Math.random() * 10000)}@test.com`;
const PASSWORD = "password123";

async function run() {
    console.log("--- STARTING E2E TEST: " + EMAIL + " ---");

    try {
        // 1. Register & Login
        console.log("Step 1: Auth...");
        await axios.post(`${GATEWAY_URL}/auth/register`, {
            email: EMAIL, password: PASSWORD, name: "Tester", companyName: "TestCorp"
        });
        const login = await axios.post(`${GATEWAY_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
        const jwt = login.data.access_token;

        // 2. Upload
        console.log("Step 2: Upload CV...");
        const form = new FormData();
        form.append("file", fs.createReadStream(path.join(__dirname, "../backend/ai_service/sample.pdf")));
        form.append("candidateName", "E2E Candidate");
        const upload = await axios.post(`${GATEWAY_URL}/api/v1/interviews/upload`, form, {
            headers: { ...form.getHeaders(), "Authorization": `Bearer ${jwt}` }
        });
        const { interviewId, inviteUrl } = upload.data;
        const token = inviteUrl.split("/").pop();

        // 3. Stages
        console.log("Step 3: Progressing Stages...");
        await axios.post(`${GATEWAY_URL}/api/v1/interviews/session/${token}/stage`, { stage: 'quiz' });
        const quiz = await axios.get(`${GATEWAY_URL}/api/v1/interviews/session/${token}/quiz`);
        const answers = {};
        quiz.data.forEach((q, i) => answers[i] = q.correct_answer);
        await axios.post(`${GATEWAY_URL}/api/v1/interviews/session/${token}/quiz/submit`, { results: answers });

        await axios.post(`${GATEWAY_URL}/api/v1/interviews/session/${token}/stage`, { stage: 'coding' });
        await axios.post(`${GATEWAY_URL}/api/v1/interviews/session/${token}/coding/submit`, {
            solution: "def test(): return True",
            results: { test_passed: 1, total_tests: 1 }
        });

        // 4. Chat & Conclusion
        console.log("Step 4: AI Defense Chat...");
        await axios.post(`${GATEWAY_URL}/api/v1/interviews/session/${token}/stage`, { stage: 'chat' });
        const socket = io(GATEWAY_URL);
        
        await new Promise((resolve, reject) => {
            socket.on("connect", () => socket.emit("start_interview", { interviewId }));
            socket.on("interviewer_message", () => {
                socket.emit("candidate_message", { interviewId, text: "I used O(1) space." });
            });
            socket.on("report_ready", () => {
                console.log("✅ Chat finished & Report ready");
                socket.disconnect();
                resolve();
            });
            socket.on("connect_error", (err) => reject(err));
            setTimeout(() => reject("Timeout"), 60000);
        });

        // 5. Verify
        console.log("Step 5: Verifying Review Data...");
        const review = await axios.get(`${GATEWAY_URL}/api/v1/interviews/${interviewId}`, {
            headers: { "Authorization": `Bearer ${jwt}` }
        });
        
        if (review.data.status === 'completed' && review.data.messages.length > 0) {
            console.log("\n✅ E2E TEST PASSED SUCCESSFULLY!");
            process.exit(0);
        } else {
            console.error("❌ Data verification failed");
            process.exit(1);
        }

    } catch (e) {
        console.error("\n❌ E2E TEST FAILED");
        console.error(e.response?.data || e.message);
        process.exit(1);
    }
}

run();
