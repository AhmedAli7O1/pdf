import hummus from 'hummus';
import { IMergingPdf, IPdfAppendOpts, RangeType } from './interfaces';

function appendPagesToFile(pdfWriter: any, src: string | Buffer, specificRanges?: number[][]): void {
  if (Buffer.isBuffer(src)) {
    src = hummus.PDFRStreamForBuffer(src);
  }

  const options: IPdfAppendOpts = {
    type: (specificRanges) ? RangeType.SpecificRanges : RangeType.allPages,
    specificRanges
  };

  pdfWriter.appendPDFPagesFromPDF(src, options);
}

export function mergePdfs(targetPath: string, mergingPdfs: IMergingPdf[]): string {
  const pdfWriter = hummus.createWriter(targetPath);

  mergingPdfs.forEach(mergingPdf => appendPagesToFile(pdfWriter, mergingPdf.src, mergingPdf.pageRanges));

  pdfWriter.end();

  return targetPath;
}
