import http from "http";

const boundary = "----TestBoundary12345";

// Minimal but valid PDF (no text layer - intentionally to test error)
const minPdfNoText = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
  "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n" +
  "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n" +
  "0000000058 00000 n\n0000000115 00000 n\n" +
  "trailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF"
);

const part1 = Buffer.from(
  "--" + boundary + "\r\nContent-Disposition: form-data; name=\"planType\"\r\n\r\nbasic\r\n"
);
const part2Header = Buffer.from(
  "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.pdf\"\r\nContent-Type: application/pdf\r\n\r\n"
);
const tail = Buffer.from("\r\n--" + boundary + "--\r\n");
const body = Buffer.concat([part1, part2Header, minPdfNoText, tail]);

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/scan/upload",
  method: "POST",
  headers: {
    "Content-Type": "multipart/form-data; boundary=" + boundary,
    "Content-Length": body.length,
  },
};

console.log("Sending PDF upload request...");

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("STATUS:", res.statusCode);
    console.log("RESPONSE:", data);
  });
});

req.on("error", (e) => console.error("REQUEST ERROR:", e.message));
req.write(body);
req.end();
