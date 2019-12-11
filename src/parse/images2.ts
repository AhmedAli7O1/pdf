import PDF from 'pdf-image';
import fs from 'fs';
import util from 'util';
import constants from './constants';

const { convertExtension } = constants;
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

export async function convertPDFPageToPNG(pdfPath: string, tmpDir: string, pageNumber: number, convertOptions: any) {

  const pdfImage = new PDF.PDFImage(pdfPath, {
    convertOptions,
    convertExtension,
    outputDirectory: tmpDir
  });

  const imagePath = await pdfImage.convertPage(pageNumber);
  const base64Image = await readFile(imagePath, 'base64');
  await unlink(imagePath);

  return base64Image;
}
