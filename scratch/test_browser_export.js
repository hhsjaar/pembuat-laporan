const puppeteer = require("puppeteer-core");
const fs = require("fs");

async function test() {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  
  // Load a simple page and inject html2pdf
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      </head>
      <body>
        <div id="test-content" style="padding: 20px; font-family: Arial; background: white; color: black;">
          <h1>TEST POLISI LAPORAN</h1>
          <p>Ini adalah isi laporan informasi.</p>
        </div>
      </body>
    </html>
  `);

  const pdfBase64 = await page.evaluate(async () => {
    const el = document.getElementById("test-content");
    const opt = {
      margin: 10,
      filename: "test.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, scrollY: 0, scrollX: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
    return await html2pdf().set(opt).from(el).outputPdf("datauristring");
  });

  const base64Data = pdfBase64.replace(/^data:application\/pdf;filename=generated.pdf;base64,/, "").replace(/^data:application\/pdf;base64,/, "");
  fs.writeFileSync("scratch/output_test_browser.pdf", Buffer.from(base64Data, "base64"));
  console.log("PDF written, size:", fs.statSync("scratch/output_test_browser.pdf").size);

  await browser.close();
}

test().catch(console.error);
