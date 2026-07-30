const months = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, agu: 7, agt: 7, sep: 8, okt: 9, nov: 10, des: 11
};

const parseIndonesianDate = (dateStr) => {
  if (!dateStr) return null;
  const cleanStr = dateStr.toLowerCase();
  const match = cleanStr.match(/(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthName = match[2];
    let year = parseInt(match[3], 10);
    const month = months[monthName];
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }
  return null;
};

const getExportFilename = (type, createdAt, reportData) => {
  let dateObj = null;

  if (reportData) {
    if (type === "rencana-kegiatan" && reportData.hari_tanggal) {
      dateObj = parseIndonesianDate(reportData.hari_tanggal);
    } else if (type === "laporan-harian-intelijen" && reportData.tanggal) {
      dateObj = parseIndonesianDate(reportData.tanggal);
    }
  }

  if (!dateObj) {
    const baseDate = createdAt ? new Date(createdAt) : new Date();
    if (type === "rencana-kegiatan") {
      dateObj = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
    } else {
      dateObj = baseDate;
    }
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);

  if (type === "rencana-kegiatan") {
    return `REN-${day}${month}${year}.docx`;
  }
  if (type === "laporan-harian-intelijen") {
    return `LAPHAR-${day}${month}${year}.docx`;
  }
  return null;
};

// Run test cases
const tests = [
  {
    type: "rencana-kegiatan",
    reportData: { hari_tanggal: "Sabtu, 30 Mei 2026" },
    expected: "REN-300526.docx"
  },
  {
    type: "laporan-harian-intelijen",
    reportData: { tanggal: "29 Mei 2026" },
    expected: "LAPHAR-290526.docx"
  },
  {
    type: "laporan-harian-intelijen",
    reportData: { tanggal: "Hari Kamis, tanggal 2 Juli 2026" },
    expected: "LAPHAR-020726.docx"
  },
  {
    type: "rencana-kegiatan",
    reportData: null,
    createdAt: "2026-07-29T10:00:00Z",
    expected: "REN-300726.docx" // H+1 of July 29
  },
  {
    type: "laporan-harian-intelijen",
    reportData: null,
    createdAt: "2026-07-29T10:00:00Z",
    expected: "LAPHAR-290726.docx"
  }
];

let allPassed = true;
tests.forEach((t, idx) => {
  const result = getExportFilename(t.type, t.createdAt, t.reportData);
  const passed = result === t.expected;
  console.log(`Test ${idx + 1}: ${t.type} (data: ${JSON.stringify(t.reportData)})`);
  console.log(`  Result:   ${result}`);
  console.log(`  Expected: ${t.expected}`);
  console.log(`  Status:   ${passed ? "✅ PASSED" : "❌ FAILED"}`);
  if (!passed) allPassed = false;
});

if (allPassed) {
  console.log("\n🎉 All tests passed successfully!");
} else {
  console.error("\n❌ Some tests failed.");
  process.exit(1);
}
