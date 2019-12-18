import hummus from 'hummus';
import { IMergingPdf, IPdfAppendOpts, RangeType } from './interfaces';

function appendPagesToFile(pdfWriter: any, src: string, specificRanges?: number[][]): void {
  const options: IPdfAppendOpts = {
    type: (specificRanges) ? RangeType.SpecificRanges : RangeType.allPages,
    specificRanges
  };

  // pdfWriter.appendPDFPagesFromPDF(src, options);
  appendPDFPageFromPDFWithAnnotations(pdfWriter, src, options);
}

function appendPDFPageFromPDFWithAnnotations(pdfWriter: any, srcPath: string, options: IPdfAppendOpts) {
  const cpyCxt = pdfWriter.createPDFCopyingContext(srcPath);
  const cpyCxtParser = cpyCxt.getSourceDocumentParser();

  // for each page range
  const pageRangs = options.specificRanges || [[0, cpyCxtParser.getPagesCount() - 1]];

  pageRangs.forEach(range => {
    for (let i = range[0]; i <= range[1]; i++) {

      const pageDictionary = cpyCxtParser.parsePageDictionary(i);

      if (!pageDictionary.exists('Annots')) { cpyCxt.appendPDFPageFromPDF(i); } // if no annotation just append the page
      else {
        // this const here will save any reffed objects from the copied annotations object.
        // they will be written after the page copy writing as to not to disturb the
        // page object writing itself.
        let reffedObjects: any[] = [];

        pdfWriter.getEvents().once('OnPageWrite', (params: any) => {
          // using the page write event, write the new annotations. just copy the object
          // as is, saving any referenced objects for future writes
          params.pageDictionaryContext.writeKey('Annots');
          reffedObjects = cpyCxt.copyDirectObjectWithDeepCopy(pageDictionary.queryObject('Annots'));
        });

        // write page. this will trigger the event
        cpyCxt.appendPDFPageFromPDF(i);

        // now write the reffed object (should be populated cause onPageWrite was written)
        // note that some or all annotations may be embedded, in which case this array
        // wont hold all annotation objects
        if (reffedObjects && reffedObjects.length > 0) {
          cpyCxt.copyNewObjectsForDirectObject(reffedObjects);
        }
      }
    }
  });
}

export function mergePdfs(targetPath: string, mergingPdfs: IMergingPdf[]): string {
  const pdfWriter = hummus.createWriter(targetPath);

  mergingPdfs.forEach(mergingPdf => appendPagesToFile(pdfWriter, mergingPdf.src, mergingPdf.pageRanges));

  pdfWriter.end();

  return targetPath;
}
