'use strict';

const PDFImage = require('pdf-image').PDFImage;
const fs = require('fs');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);

async function convertPDFPageToPNG(pdfPath, tmpDir, pageNumber) {

  const pdfImage = new PDFImage(pdfPath, {
    convertOptions: {
      '-quality': '80',
      '-density': '300',
      '-alpha': 'remove'
    },
    convertExtension: 'jpg',
    outputDirectory: tmpDir
  });

  const imagePath = await pdfImage.convertPage(pageNumber);
  const base64Image = await readFile(imagePath, 'base64');
  await unlink(imagePath);

  return base64Image;
}


module.exports = {
  convertPDFPageToPNG
};