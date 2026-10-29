import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { LOGO_LEFT_BASE64, LOGO_RIGHT_BASE64 } from './logoAssets';

/**
 * Draws the official signature and credentials footer on PDF pages
 * Exactly matching the requested "System Administrator" and "Authorized Signatory" footer lines.
 */
export const drawSignatureFooter = (doc, pageNum, totalPages, pageWidth, pageHeight) => {
  // Only show signature lines and titles on the LAST page of the document
  if (pageNum === totalPages) {
    const sigLineY = pageHeight - 20;
    const sigTextY = pageHeight - 15;

    // Signature lines style
    doc.setDrawColor(100, 116, 139); // Slate 500 line
    doc.setLineWidth(0.35);

    // Left: System Administrator Line & Label
    doc.line(16, sigLineY, 74, sigLineY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // Slate 700 text
    doc.text("System Administrator", 45, sigTextY, { align: 'center' });

    // Right: Authorized Signatory Line & Label
    doc.line(pageWidth - 74, sigLineY, pageWidth - 16, sigLineY);
    doc.text("Authorized Signatory", pageWidth - 45, sigTextY, { align: 'center' });
  }

  // Bottom Border Separator
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.2);
  doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

  // Platform branding on bottom left
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("SmartBuddy Petroleum IoT Platform  •  Aarya Innovtech Pvt. Ltd.", 14, pageHeight - 5.5);

  // Page numbering on bottom right
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 5.5, { align: 'right' });
};

/**
 * Universal PDF Exporter with high-resolution Branding & Logos
 * @param {string} title - Report Title
 * @param {Array<string>} columns - Table Header Titles
 * @param {Array<Array<any>>} rows - Table Row Data
 * @param {Object} options - Filter context & styling options
 */
export const exportToPDF = (title, columns, rows, options = {}) => {
  try {
    // Standard A4 Portrait by default for all PDFs
    const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';

    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Draw Logos in Header
    // Aspect ratio 1.7:1 (e.g. 32mm width x 18mm height)
    const logoW = 32;
    const logoH = 18;
    const logoY = 6.5;

    // Left Logo (E2T / OMC / Client Branding)
    try {
      doc.addImage(LOGO_LEFT_BASE64, 'JPEG', 14, logoY, logoW, logoH);
    } catch (e) {
      console.warn("Left logo draw error:", e);
    }

    // Right Logo (SmartBuddy Branding)
    try {
      doc.addImage(LOGO_RIGHT_BASE64, 'PNG', pageWidth - 14 - logoW, logoY, logoW, logoH);
    } catch (e) {
      console.warn("Right logo draw error:", e);
    }

    // 2. Header Text (Centered safely between both logos, width ~118mm)
    const centerX = pageWidth / 2;
    doc.setTextColor(5, 150, 105); // Emerald Green
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.text("SMARTBUDDY PETROLEUM IOT PLATFORM", centerX, 13, { align: 'center' });

    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(11);
    doc.text(String(title || 'SYSTEM TELEMETRY REPORT').toUpperCase(), centerX, 19, { align: 'center' });

    // Metadata lines (OMC, RO, Machine, Period) - Placed safely BELOW the logos (Y > 25mm)
    // to guarantee ZERO overlap with left or right logos across full page width
    const metaParts = [];
    if (options.clientName && options.clientName !== 'All') metaParts.push(`OMC: ${options.clientName}`);
    if (options.roName && options.roName !== 'All') metaParts.push(`RO: ${options.roName}`);
    if (options.machineName && options.machineName !== 'All') metaParts.push(`Machine: ${options.machineName}`);
    if (options.dateRange && !options.dateRange.toLowerCase().includes('total machine')) metaParts.push(`Period: ${options.dateRange}`);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    let currentY = logoY + logoH + 3.5; // Starts at Y = 28mm (strictly below the 24.5mm logo bottom)
    if (metaParts.length > 0) {
      doc.text(metaParts.join('   |   '), centerX, currentY, { align: 'center', maxWidth: pageWidth - 28 });
      currentY += 4.5;
    }

    const genTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const roleText = options.generatedBy || 'SuperAdmin (9284188705)';
    const recordCountText = options.hideTable
      ? ''
      : `   |   Total Records: ${rows ? rows.length : 0}`;
    doc.text(`Generated: ${genTimestamp}   |   User: ${roleText}${recordCountText}`, centerX, currentY, { align: 'center', maxWidth: pageWidth - 28 });

    // Decorative Accent Line
    const lineY = currentY + 3.5;
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.7);
    doc.line(14, lineY, pageWidth - 14, lineY);

    // 3. Render Table ONLY if not hidden and rows exist
    if (!options.hideTable && Array.isArray(columns) && columns.length > 0 && Array.isArray(rows) && rows.length > 0) {
      const safeRows = rows.map(row =>
        row.map(cell => {
          if (cell === null || cell === undefined) return '-';
          let str = cell.toString().replace(/★/g, 'Stars');
          // If string contains non-ASCII characters that jsPDF Helvetica cannot render, clean them safely
          if (/[^\x20-\x7E]/.test(str)) {
            // If it has bracketed text like (Bad Odour), extract it
            const bracketMatches = Array.from(str.matchAll(/\(([^)]+)\)/g))
              .map(m => m[1].trim())
              .filter(m => m && !/[^\x00-\x7F]/.test(m));
            if (bracketMatches.length > 0) {
              return bracketMatches.join(', ');
            }
            str = str.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
          }
          return str || '-';
        })
      );

      const startTableY = lineY + 5;
      const tableFontSize = columns.length >= 7 ? 7.5 : (columns.length >= 5 ? 8 : 8.5);
      const tablePadding = columns.length >= 7 ? 1.8 : 2.2;

      const tableConfig = {
        head: [columns],
        body: safeRows,
        startY: startTableY,
        theme: 'grid',
        styles: {
          fontSize: tableFontSize,
          cellPadding: tablePadding,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          font: 'helvetica',
          valign: 'middle',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [5, 150, 105], // Emerald Green #059669
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: tableFontSize,
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate 50
        },
        margin: { top: 24, left: 14, right: 14, bottom: 28 }
      };

      if (typeof autoTable === 'function') {
        autoTable(doc, tableConfig);
      } else if (typeof doc.autoTable === 'function') {
        doc.autoTable(tableConfig);
      }
    }

    // 4.5. Embed Graphical Charts if provided
    if (Array.isArray(options.chartImages) && options.chartImages.length > 0) {
      let currentY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 8 : (lineY + 6);

      const maxContentY = pageHeight - 30; // Leave space for signature footer (sigLineY is pageHeight - 20)
      const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > maxContentY) {
          doc.addPage();
          currentY = 20;
          return true;
        }
        return false;
      };

      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      doc.text("GRAPHICAL SENSOR ANALYSIS & TRENDS", centerX, currentY, { align: 'center' });
      currentY += 6;

      const charts = options.chartImages;
      // Chart height: When table is hidden, 57mm fits all 3 rows perfectly on a single page!
      const cardHeight = options.hideTable ? 57 : 48;
      const gapY = options.hideTable ? 5 : 4;

      // Row 1: Temperature & Humidity
      if (charts[0] || charts[1]) {
        checkPageBreak(cardHeight + 4);
        if (charts[0]) doc.addImage(charts[0], 'PNG', 14, currentY, 88, cardHeight);
        if (charts[1]) doc.addImage(charts[1], 'PNG', 108, currentY, 88, cardHeight);
        currentY += cardHeight + gapY;
      }

      // Row 2: Odour & Water Alerts
      if (charts[2] || charts[3]) {
        checkPageBreak(cardHeight + 4);
        if (charts[2]) doc.addImage(charts[2], 'PNG', 14, currentY, 88, cardHeight);
        if (charts[3]) doc.addImage(charts[3], 'PNG', 108, currentY, 88, cardHeight);
        currentY += cardHeight + gapY;
      }

      // Row 3: Machine Usage (Visits) - Standard 88mm width matching other cards, centered to preserve aspect ratio
      if (charts[4]) {
        checkPageBreak(cardHeight + 4);
        const cardWidth = 88;
        if (charts[5]) {
          doc.addImage(charts[4], 'PNG', 14, currentY, cardWidth, cardHeight);
          doc.addImage(charts[5], 'PNG', 108, currentY, cardWidth, cardHeight);
        } else {
          // Exactly 5 charts: center the 5th chart horizontally so it doesn't stretch or overlap
          const centeredX = (pageWidth - cardWidth) / 2;
          doc.addImage(charts[4], 'PNG', centeredX, currentY, cardWidth, cardHeight);
        }
        currentY += cardHeight + gapY;
      }

      // Any additional charts beyond 6
      for (let i = 6; i < charts.length; i += 2) {
        checkPageBreak(cardHeight + 4);
        if (charts[i]) doc.addImage(charts[i], 'PNG', 14, currentY, 88, cardHeight);
        if (charts[i + 1]) doc.addImage(charts[i + 1], 'PNG', 108, currentY, 88, cardHeight);
        currentY += cardHeight + gapY;
      }
    }

    // Draw official signatures & footer on every page
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawSignatureFooter(doc, p, totalPages, pageWidth, pageHeight);
    }

    // 5. Save PDF File
    const sanitizedTitle = (title || 'SmartBuddy_Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedTitle}_${dateStr}.pdf`;
    doc.save(filename);

  } catch (error) {
    console.error("PDF Generation Error: ", error);
    alert("Error generating PDF: " + error.message);
  }
};

/**
 * Superadmin Executive Dashboard PDF Exporter
 * Generates an executive summary of OMCs, ROs, Machines, Sensor Health, and Alerts.
 */
export const exportDashboardPDF = (data = {}) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Logos
    const logoW = 32;
    const logoH = 18;
    const logoY = 6.5;

    try {
      doc.addImage(LOGO_LEFT_BASE64, 'JPEG', 14, logoY, logoW, logoH);
    } catch (e) {}

    try {
      doc.addImage(LOGO_RIGHT_BASE64, 'PNG', pageWidth - 14 - logoW, logoY, logoW, logoH);
    } catch (e) {}

    // 2. Header
    const centerX = pageWidth / 2;
    doc.setTextColor(5, 150, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.text("SMARTBUDDY PETROLEUM IOT PLATFORM", centerX, 13, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text("SUPERADMIN EXECUTIVE OVERVIEW REPORT", centerX, 19, { align: 'center' });

    const genTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${genTimestamp}   |   Administrator: 9284188705 (SuperAdmin)`, centerX, 28, { align: 'center', maxWidth: pageWidth - 28 });

    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.7);
    doc.line(14, 32, pageWidth - 14, 32);

    // 3. KPI Summary Table
    const kpiColumns = ['METRIC', 'VALUE', 'STATUS / DETAILS'];
    const kpiRows = [
      ['Total OMCs Registered', String(data.omcsCount ?? 0), 'Active Petroleum Clients'],
      ['Total ROs Registered', String(data.rosCount ?? 0), 'Retail Outlets Deployed'],
      ['Total IoT Machines', String(data.machinesCount ?? 0), `${data.activeMachinesCount ?? 0} Online, ${data.inactiveMachinesCount ?? 0} Offline`],
      ['Active System Alerts', String(data.activeAlertsCount ?? 0), data.activeAlertsCount > 0 ? 'Requires Maintenance Action' : 'All Systems Nominal'],
      ['Today\'s Machine Users', String(data.usersToday ?? 0), 'Total Footfall Across All Machines'],
      ['Water Level Status', data.waterLowCount > 0 ? `${data.waterLowCount} Low` : 'Normal', 'Adequate supply across stations'],
    ];

    autoTable(doc, {
      head: [kpiColumns],
      body: kpiRows,
      startY: 36,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14, bottom: 28 }
    });

    // 4. Recent Alerts Table
    const alertsStartY = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("RECENT SYSTEM TELEMETRY ALERTS", 14, alertsStartY);

    const alertColumns = ['MACHINE ID', 'DATE & TIME', 'SEVERITY', 'ALERT DETAILS'];
    const recentAlerts = data.recentAlerts || [];
    const alertRows = recentAlerts.length > 0 
      ? recentAlerts.slice(0, 15).map(a => [
          a.machineName || a.machine_id || 'Machine',
          a.time ? `${a.date || ''} ${a.time}` : (a.timestamp || new Date().toLocaleString()),
          a.severity || 'Medium',
          a.message || a.issue || 'Telemetry event'
        ])
      : [['No Active Alerts', '-', 'Normal', 'All IoT machines functioning properly']];

    autoTable(doc, {
      head: [alertColumns],
      body: alertRows,
      startY: alertsStartY + 3,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14, bottom: 28 }
    });

    // Draw official signatures & footer on every page
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawSignatureFooter(doc, p, totalPages, pageWidth, pageHeight);
    }

    const filename = `Superadmin_Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);

  } catch (err) {
    console.error("Dashboard PDF Export error:", err);
    alert("Error generating Dashboard PDF: " + err.message);
  }
};

/**
 * Universal CSV/Excel exporter with UTF-8 BOM encoding for proper Marathi & English characters
 */
export const exportToExcel = (title, columns, rows) => {
  try {
    const safeRows = rows.map(row => 
      row.map(cell => `"${(cell ? cell.toString() : '-').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = '\uFEFF' + [columns.join(','), ...safeRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Excel Generation Error: ", error);
    alert("Error generating Excel file: " + error.message);
  }
};

export const handlePrint = () => {
  window.print();
};

/**
 * High-Definition Multi-Page PDF Exporter using native browser HTML/Canvas rendering
 * Fully preserves Hindi, Marathi, Devanagari ligatures, emojis, and styling with 100% fidelity.
 */
export const exportHtmlReportToPDF = async (element, filename = 'Report.pdf', options = {}) => {
  try {
    if (!element) return;
    const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = orientation === 'landscape' ? 297 : 210;
    const pageHeight = orientation === 'landscape' ? 210 : 297;
    const margin = options.margin !== undefined ? options.margin : 10;
    const footerHeight = options.hideFooter ? 0 : 26; // Reserve 26mm for signature footer at true bottom
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2) - footerHeight;

    const canvas = await html2canvas(element, {
      scale: 2, // 2x for sharp HD text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const pageCanvasHeight = (contentHeight * canvasWidth) / contentWidth;

    let currentY = 0;
    let pageIndex = 0;

    while (currentY < canvasHeight) {
      if (pageIndex > 0) {
        pdf.addPage('a4', orientation);
      }

      const sliceHeight = Math.min(pageCanvasHeight, canvasHeight - currentY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvasWidth;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceHeight);

      ctx.drawImage(
        canvas,
        0, currentY, canvasWidth, sliceHeight,
        0, 0, canvasWidth, sliceHeight
      );

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.96);
      const renderHeight = (sliceHeight * contentWidth) / canvasWidth;
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, renderHeight);

      currentY += sliceHeight;
      pageIndex++;
    }

    // Draw official signature footer at the true bottom of each page
    if (!options.hideFooter) {
      const totalPages = pdf.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        drawSignatureFooter(pdf, p, totalPages, pageWidth, pageHeight);
      }
    }

    pdf.save(filename);
  } catch (err) {
    console.error("HTML to PDF error:", err);
    throw err;
  }
};

