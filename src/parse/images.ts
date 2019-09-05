import Canvas from 'canvas';
import assert from 'assert';
import {PDFPageProxy, PDFPageViewport} from 'pdfjs-dist';

class NodeCanvasFactory {
  create(width: number, height: number) {
    assert(width > 0 && height > 0, 'Invalid canvas size');
    const canvas = Canvas.createCanvas(width, height);
    const context = canvas.getContext('2d');

    return {
      canvas: canvas,
      context: context,
    };
  }

  reset(canvasAndContext: any, width: number, height: number) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');
    assert(width > 0 && height > 0, 'Invalid canvas size');
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: any) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');

    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

export async function extractPNG (page: PDFPageProxy, viewport: PDFPageViewport) {
  const canvasFactory = new NodeCanvasFactory();

  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);


  const renderContext = {
    canvasContext: canvasAndContext.context,
    viewport: viewport,
    canvasFactory: canvasFactory
  };

  await page.render(renderContext).promise;

  return canvasAndContext.canvas.toBuffer();
}
