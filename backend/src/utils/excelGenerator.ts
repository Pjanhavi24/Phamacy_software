import ExcelJS from 'exceljs';

export const generateExcel = async (title: string, data: any[]): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title);

  if (data.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  const flatData = data.map((item: any) => {
    const flat: any = {};
    const flatten = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}_${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          flatten(value, newKey);
        } else if (!Array.isArray(value)) {
          flat[newKey] = value instanceof Date ? value.toLocaleDateString() : value;
        }
      }
    };
    flatten(item);
    return flat;
  });

  const headers = Object.keys(flatData[0] || {});
  worksheet.addRow(headers);
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

  flatData.forEach((row: any) => {
    worksheet.addRow(headers.map(h => row[h]));
  });

  worksheet.columns.forEach(col => { col.width = 18; });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
