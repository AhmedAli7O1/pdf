import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';
import fs from 'fs';
import uuid from 'uuid';
import constants from './constants';
import { getDocument, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { pdfPromise } from './utils';
import { mapAnnotations, IOriginalAnnotation, IAnnotation } from './annotation';
import { IPage, IPageOptions } from './interfaces';
import { Viewport } from './viewport';
import { convertPDFPageToPNG } from './images2';
import hummus from 'hummus';

const writeFile: Function = promisify(fs.writeFile);
const tmpDir: string = join(tmpdir(), constants.imageMagicTempDir);

const logging: boolean = true;
const LOGGER = console.log;

try {
  fs.lstatSync(tmpDir);
}
catch (e) {
  console.log(`creating tmp directory at ${tmpDir}`);
  fs.mkdirSync(tmpDir);
}

async function getPathFromBuffer(buffer: Buffer): Promise<string | undefined> {
  if (typeof buffer !== 'string') {
    const filePath = join(tmpDir, uuid.v4());
    await writeFile(filePath, buffer);

    return filePath;
  }
}
async function getPagesHandlers(doc: PDFDocumentProxy): Promise<PDFPageProxy[]> {
  const pagesPromise: Promise<PDFPageProxy>[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    pagesPromise.push(pdfPromise<PDFPageProxy>(doc.getPage(i)));
  }

  return Promise.all(pagesPromise);
}
async function getPagesInfo(filePath: string, pages: PDFPageProxy[], pageOptions: IPageOptions): Promise<IPage[]> {
  return Promise.all(
    pages.map(async (page: PDFPageProxy) => {
      const viewport = page.getViewport({ scale: pageOptions.scale });
      const originalAnnotations: IOriginalAnnotation[] = <any>await page.getAnnotations();
      const annotation: IAnnotation = mapAnnotations(originalAnnotations, viewport);
      const customViewport = new Viewport(viewport);

      let image;

      if (pageOptions.extract.images) {

        const convertOpts = (pageOptions.extract) ? pageOptions.extract.imageMagic : {};

        image = await convertPDFPageToPNG(filePath, tmpDir, page.pageNumber - 1, convertOpts);
      }

      return {
        pageNumber: page.pageNumber,
        viewport: customViewport,
        annotation,
        image
      };
    })
  );
}
function disableLogging(): void {
  console.log = () => { };
}
function enableLogging(): void {
  console.log = LOGGER;
}

export async function getForms(source: string | Uint8Array, pageOptions?: IPageOptions): Promise<IPage[]>
export async function getForms(source: string, pageOptions?: IPageOptions): Promise<IPage[]>
export async function getForms(source: any, pageOptions?: IPageOptions): Promise<IPage[]> {

  if (!logging) { disableLogging(); }

  pageOptions = pageOptions || { scale: 1, extract: { images: false, imageMagic: {} } };

  const filePath = await getPathFromBuffer(source) || source;
  const doc: PDFDocumentProxy = await getDocument(source).promise;
  const pagesHandlers: PDFPageProxy[] = await getPagesHandlers(doc);
  const pages: IPage[] = await getPagesInfo(filePath, pagesHandlers, pageOptions);

  if (!logging) { enableLogging(); }

  return pages;
}

export function getPdfInfo(source: string): { pageCount: number, encrypted: boolean } {
  const reader = hummus.createReader(source);

  return {
    pageCount: reader.getPagesCount(),
    encrypted: reader.isEncrypted()
  };
}
