import {getDocument, PDFDocumentProxy, PDFPageProxy, PDFJSStatic} from 'pdfjs-dist';
import {pdfPromise} from './utils'
import {mapAnnotations, IOriginalAnnotation} from "./annotation";
import {IAnnotation} from "./annotation/annotation.interface";
import {IPage} from "./page.interface";
import {Viewport} from "./viewport";
import {extractPNG} from "./images";
import {IPageOptions} from "./page-options.interface";


export class PDF {

  private logging: boolean;
  private LOGGER = console.log;

  constructor(logging: boolean) {
    this.logging = false;
  }

  async getPages(sources: string, pageOptions?: IPageOptions): Promise<IPage[]>;
  async getPages(sources: Uint8Array, pageOptions?: IPageOptions): Promise<IPage[]>;
  async getPages(source: any, pageOptions?: IPageOptions): Promise<IPage[]> {

    // set defaults
    pageOptions = pageOptions  || {
      scale: 1,
      extract: {
        images: false
      }
    };

    if (!this.logging) this.disableLogging();

    const doc: PDFDocumentProxy = await getDocument(source).promise;
    const pagesHandlers: PDFPageProxy[] = await this.getPagesHandlers(doc);
    const pages: IPage[] = await this.getPagesInfo(pagesHandlers, pageOptions);

    if (!this.logging) this.enableLogging();

    return pages;
  }

  private async getPagesHandlers(doc: PDFDocumentProxy): Promise<PDFPageProxy[]> {
    const pagesPromise: Promise<PDFPageProxy>[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      pagesPromise.push(pdfPromise<PDFPageProxy>(doc.getPage(i)));
    }

    return Promise.all(pagesPromise);
  }

  private async getPagesInfo(pages: PDFPageProxy[], pageOptions: IPageOptions): Promise<IPage[]> {
    return Promise.all(
      pages.map(async (page: PDFPageProxy) => {
        const viewport = page.getViewport({ scale: pageOptions.scale });
        const originalAnnotations: IOriginalAnnotation[] = <any>await page.getAnnotations();
        const annotation: IAnnotation = mapAnnotations(originalAnnotations, viewport);
        const customViewport = new Viewport(viewport);

        let image;

        if (pageOptions.extract.images) {
          image = await extractPNG(page, viewport);
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

  private disableLogging() {
    console.log = () => { };
  }

  private enableLogging() {
    console.log = this.LOGGER;
  }
}
