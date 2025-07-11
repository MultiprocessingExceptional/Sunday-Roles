import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { monthOptions } from "../constants";
import birthdayData from "../data/birthdayAnniversary.json";

// Updated headings to match the correct order
const pdfHeadings = [
  "Date",
  "Opening Prayer",
  "Praise & Worship",
  "Scripture Passage",
  "MV",
  "Scripture Reading",
  "Message Theme",
  "Message",
  "Intercessory Prayer",
  "Offertory Prayer",
];

// Fields that should not wrap text
const NO_WRAP_FIELDS = [
  "Scripture Passage",
  "MV",
  "Scripture Reading",
  "Intercessory Prayer",
  "Offertory Prayer",
];

// Function to generate dynamic filename based on first and third months
function generateFileName(data) {
  if (!data || data.length === 0) {
    return "Order of Sunday";
  }

  const firstMonth = data[0]?.selectedMonth || "";
  const thirdMonth =
    data[2]?.selectedMonth || data[data.length - 1]?.selectedMonth || "";

  if (firstMonth && thirdMonth && firstMonth !== thirdMonth) {
    return `Order of Sunday : ${firstMonth} - ${thirdMonth}`;
  } else if (firstMonth) {
    return `Order of Sunday : ${firstMonth}`;
  } else {
    return "Order of Sunday";
  }
}

// Format full date (used in Sunday roles)
function formatFullDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Format short date with suffix (used in birthdays/anniversaries)
function formatShortDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });

  const getSuffix = (d) => {
    if (d > 3 && d < 21) return "th";
    switch (d % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return `${day}${getSuffix(day)} ${month}`;
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function filterByMonth(entries, monthName) {
  return entries.filter(({ date }) => {
    const monthIndex = new Date(date).getMonth();
    return monthOptions[monthIndex] === monthName;
  });
}

// Helper function to wrap text only for Message Theme
function wrapText(text, maxLength = 60) {
  if (!text || text.length <= maxLength) return text;

  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}

// Helper function to format multi-input fields with moderate spacing
function formatMultiInputField(value) {
  if (Array.isArray(value)) {
    const filteredValues = value.filter((v) => v && v.trim() !== "");
    // Add moderate spacing between inputs (between \n and \n\n)
    return filteredValues.join("\n");
  }
  return value || "";
}

// Helper function to format fields that should not wrap individual entries
function formatNoWrapField(value) {
  if (Array.isArray(value)) {
    const filteredValues = value.filter((v) => v && v.trim() !== "");
    // Keep separate lines but prevent wrapping within each entry
    return filteredValues.map((v) => v.replace(/\s+/g, " ")).join("\n");
  }
  return value ? value.replace(/\s+/g, " ") : "";
}

export function generatePDF(
  data,
  bgColor,
  textColor,
  fontSize = 12,
  cellPadding = 2.2,
  pdfHeight = 400
) {
  const doc = new jsPDF("landscape", "mm", [420, pdfHeight]);
  let startY = 4;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 4;

  const selectedMonths = data.map((d) => d.selectedMonth);
  const messageThemeIndex = pdfHeadings.findIndex((h) => h === "Message Theme");

  // 1. Sunday Roles per Month
  data.forEach(({ sundays, selectedMonth }) => {
    if (sundays.length === 0) return;

    const pageWidth = doc.internal.pageSize.getWidth();
    const headingHeight = 12;

    doc.setFillColor(bgColor);
    doc.rect(5, startY, pageWidth - 10, headingHeight, "F");
    doc.setTextColor(textColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(
      `Order of Sunday – ${selectedMonth}`,
      pageWidth / 2,
      startY + headingHeight / 2 - 0.5,
      { align: "center", baseline: "middle" }
    );

    startY += headingHeight;

    const body = sundays.map((sunday) => {
      const formattedDate = formatFullDate(sunday.fields["Date"]);

      if (sunday.isMerged) {
        return [
          {
            content: formattedDate,
            styles: { halign: "center", valign: "middle" },
          },
          {
            content: sunday.fields["MergedContent"] || "",
            colSpan: pdfHeadings.length - 1,
            styles: {
              halign: "center",
              valign: "middle",
              overflow: "linebreak",
            },
          },
        ];
      }

      return pdfHeadings.map((heading) => {
        let value = sunday.fields[heading] || "";

        if (heading === "Date") {
          value = formattedDate;
        } else if (NO_WRAP_FIELDS.includes(heading)) {
          // Use no-wrap formatting for specified fields
          value = formatNoWrapField(value);
        } else if (
          ["Scripture Reading", "Scripture Passage", "MV"].includes(heading)
        ) {
          value = formatMultiInputField(value);
        }

        // Determine overflow behavior based on field type
        const overflowBehavior = NO_WRAP_FIELDS.includes(heading)
          ? "visible"
          : "linebreak";

        return {
          content: value,
          styles: {
            halign: "center",
            valign: "middle",
            overflow: overflowBehavior,
            cellPadding: cellPadding,
          },
        };
      });
    });

    // Create column styles with specific settings for no-wrap fields
    const columnStyles = {
      [messageThemeIndex]: {
        cellWidth: 60, // Fixed width
        overflow: "linebreak",
      },
    };

    // Add column styles for no-wrap fields
    NO_WRAP_FIELDS.forEach((fieldName) => {
      const fieldIndex = pdfHeadings.findIndex(
        (heading) => heading === fieldName
      );
      if (fieldIndex !== -1) {
        columnStyles[fieldIndex] = {
          overflow: "visible",
          cellWidth: "wrap", // Allow cell to expand to fit content
        };
      }
    });

    autoTable(doc, {
      startY,
      head: [pdfHeadings],
      body,
      styles: {
        fontSize: fontSize,
        cellPadding: cellPadding,
        overflow: "linebreak",
        lineWidth: 0.2,
        lineColor: 180,
        halign: "center",
        valign: "middle",
        textColor: [0, 0, 0],
      },
      columnStyles,
      headStyles: {
        fillColor: bgColor,
        textColor: textColor,
        fontStyle: "bold",
        fontSize: fontSize,
      },
      theme: "grid",
      tableWidth: "auto",
      margin: { left: 5, right: 5 },
      didDrawPage: (data) => {
        startY = data.cursor.y + 6;
      },
    });

    if (startY > pageHeight - bottomMargin - 40) {
      doc.addPage();
      startY = 8;
    }
  });

  // 2. Birthday & Anniversary Grid
  const colCount = selectedMonths.length;
  const maxRows = Math.max(
    ...selectedMonths.map(
      (month) =>
        filterByMonth(birthdayData.birthdays, month).length +
        filterByMonth(birthdayData.anniversaries, month).length
    )
  );

  const monthColumns = selectedMonths.map((month) => {
    const birthdays = filterByMonth(birthdayData.birthdays, month).map(
      ({ name, date }) => [toTitleCase(name), "Birthday", formatShortDate(date)]
    );
    const anniversaries = filterByMonth(birthdayData.anniversaries, month).map(
      ({ name, date }) => [
        toTitleCase(name),
        "Wedding Anniversary",
        formatShortDate(date),
      ]
    );
    return [...birthdays, ...anniversaries];
  });

  const tableRows = [];
  for (let i = 0; i < maxRows; i++) {
    const row = [];
    for (let m = 0; m < colCount; m++) {
      const entry = monthColumns[m][i] || ["", "", ""];
      row.push(...entry);
    }
    tableRows.push(row);
  }

  // If not enough room left for birthday table, add a new page
  if (startY + tableRows.length * 8 > pageHeight - bottomMargin) {
    doc.addPage();
    startY = 8;
  }

  autoTable(doc, {
    startY: startY + 4,
    head: [
      selectedMonths.map((m) => ({
        content: m,
        colSpan: 3,
        styles: {
          halign: "center",
          fillColor: bgColor,
          textColor: textColor,
          fontStyle: "bold",
        },
      })),
      Array(colCount).fill(["Name", "Occasion", "Date"]).flat(),
    ],
    body: tableRows,
    styles: {
      fontSize: fontSize,
      cellPadding: { top: cellPadding, bottom: cellPadding, left: 1, right: 1 },
      lineWidth: 0.2,
      lineColor: 180,
      halign: "center",
      valign: "middle",
      overflow: "linebreak",
      textColor: [0, 0, 0],
    },
    headStyles: {
      fontStyle: "bold",
      fontSize: fontSize,
    },
    didParseCell(data) {
      // Reset background of 2nd row of headers
      if (data.section === "head" && data.row.index === 1) {
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.textColor = [0, 0, 0];
      }
    },
    theme: "grid",
    tableWidth: "auto",
    margin: { left: 5, right: 5 },
  });

  // Generate dynamic filename and save
  const fileName = generateFileName(data);
  doc.save(`${fileName}.pdf`);
}
