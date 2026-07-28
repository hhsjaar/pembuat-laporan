const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");

const cleanXmlTags = (xml) => {
  let result = "";
  let inBraces = 0;
  let i = 0;
  
  while (i < xml.length) {
    const char = xml[i];
    
    if (char === "{") {
      inBraces++;
      result += char;
      i++;
    } else if (char === "}") {
      inBraces--;
      if (inBraces < 0) inBraces = 0;
      result += char;
      i++;
    } else if (inBraces > 0) {
      if (char === "<") {
        while (i < xml.length && xml[i] !== ">") {
          i++;
        }
        if (i < xml.length) {
          i++; // skip the >
        }
      } else {
        result += char;
        i++;
      }
    } else {
      result += char;
      i++;
    }
  }
  return result;
};

const templatePath = path.join(__dirname, "..", "templates", "laporan-harian-intelijen.docx");
const content = fs.readFileSync(templatePath, "binary");
const zip = new PizZip(content);
let docXml = zip.files["word/document.xml"].asText();

console.log("Original occurrences of fakta_sosial_budaya:");
const index1 = docXml.indexOf("fakta_sosial_budaya");
if (index1 !== -1) {
  console.log(docXml.substring(index1 - 50, index1 + 100));
} else {
  console.log("Not found in original!");
}

docXml = cleanXmlTags(docXml);

console.log("\nCleaned occurrences of fakta_sosial_budaya:");
const index2 = docXml.indexOf("fakta_sosial_budaya");
if (index2 !== -1) {
  console.log(docXml.substring(index2 - 50, index2 + 100));
} else {
  console.log("Not found in cleaned!");
}

// Check other placeholders
const fields = ["fakta_sosial_budaya", "kriminalitas_text", "laka_lantas_text", "bencana_alam_text", "tahanan_text", "vvip_text", "lain_lain_text"];
console.log("\nChecking all LHI placeholders in cleaned XML:");
fields.forEach((field) => {
  const cleanRegex = new RegExp(`\\{\\{${field}\\}\\}`, "g");
  const matches = docXml.match(cleanRegex);
  console.log(`- {{${field}}}: ${matches ? matches.length : 0} match(es) found.`);
});
