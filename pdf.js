'use strict';

const pdfjsLib = require('pdfjs-dist');
const { extractPNG } = require('./images');


const kFBARequired = 0x00000010;
const kMinHeight = 20;
const pixelPerGrid = 24;
const LOGGER = console.log;


async function getForms({ src, scale = 1, enableLogs = false }) {

  if (!enableLogs) disableLogging();

  const doc = await pdfjsLib.getDocument(src).promise;

  const promises = [];

  for (let i = 1; i <= doc.numPages; i++) {
    promises.push(getAnnotations(doc, i, scale));
  }

  const pages = await Promise.all(promises);

  const result = mapInputs(pages);

  if (!enableLogs) enableLogging();

  return result;
}

async function getAnnotations(doc, pageNumber, scale) {
  const page = await doc.getPage(pageNumber);
  const inputs = await page.getAnnotations();
  const viewPort = page.getViewport({ scale });
  const image = await extractPNG(page, viewPort);

  return { pageNumber, inputs, viewPort, image };
}

function mapInputs(pages = []) {
  return pages.map(page => {
    page.inputs = page.inputs.map(input => {

      const position = getPosition(input, page.viewPort);

      return {
        name: input.fieldName,
        alternativeText: input.alternativeText,
        format: "text", // date, password, number, text
        type: getInputType(page.inputs, input),
        required: isRequired(input),
        readonly: input.readOnly,
        value: input.fieldValue || undefined,
        position: {
          x: position.x,
          y: position.y
        },
        size: {
          width: position.w,
          height: position.h
        },
        checked: input.hasAppearance || undefined,
        options: mapOptions(input.options),
        combo: input.combo,
        multiSelect: input.multiSelect,
        textAlignment: input.textAlignment,
        maxLen: input.maxLen,
      };
    });

    return page;
  });
}

function getPosition(input, viewPort) {
  const fieldRect = viewPort.convertToViewportRectangle(input.rect);
  const rect = normalizeRect(fieldRect);

  let height = rect[3] - rect[1];
  if (input.fieldType === 'Tx') {
    if (height > kMinHeight + 2) {
      rect[1] += 2;
      height -= 2;
    }
  }
  else if (input.fieldType !== 'Ch') { //checkbox, radio button, and link button
    rect[1] -= 3;
  }

  height = (height >= kMinHeight) ? height : kMinHeight;

  return {
    x: toFormPoint(rect[0]),
    y: toFormPoint(rect[1]),
    w: toFormPoint(rect[2] - rect[0]),
    h: toFormPoint(height)
  };
}

function getInputType(inputs, inputInfo) {
  // TODO: handle check case
  if (inputInfo.fieldType === 'Btn') {
    if (inputInfo.radioButton) {
      return 'radioButton';
    }
    if (inputInfo.checkBox) {
      const found = inputs.filter(x => x.fieldName === inputInfo.fieldName);
      return found.length > 1 ? 'radioButton' : 'checkBox';
    }
    else if (inputInfo.pushButton) {
      return 'button';
    }
  }
  else if (inputInfo.fieldType === 'Tx') {
    return 'textBox';
  }
  else if (inputInfo.fieldType === 'Ch') {
    return 'dropdown';
  }
}

function isRequired(input) {
  let attributeMask = 0;

  if (input.fieldFlags & 0x00000002) {
    attributeMask |= kFBARequired;
  }

  return attributeMask === 16;
}

function mapOptions(options = []) {
  if (options.length) {
    return options.map(op => {
      return {
        value: op.exportValue,
        display: op.displayValue
      };
    });
  }
}

function normalizeRect(rect) {
  let r = rect.slice(0); // clone rect
  if (rect[0] > rect[2]) {
    r[0] = rect[2];
    r[2] = rect[0];
  }
  if (rect[1] > rect[3]) {
    r[1] = rect[3];
    r[3] = rect[1];
  }
  return r;
}

function toFormPoint(viewPort) {
  return toFixedFloat(viewPort / pixelPerGrid);
}

function toFixedFloat(fNum) {
  return parseFloat(fNum.toFixed(3));
}

function disableLogging() {
  console.log = () => { };
}

function enableLogging() {
  console.log = LOGGER;
}


module.exports = {
  getForms
};